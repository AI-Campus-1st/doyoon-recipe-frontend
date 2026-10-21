import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  request, setTransport, ApiError, StaleSessionError, configureHttpClient, bumpSession,
  subscribeSlowRequests, warmUpServer, HTTP_DEFAULTS,
} from './httpClient.js';

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('httpClient.request', () => {
  let onUnauthorized;
  beforeEach(() => {
    onUnauthorized = vi.fn();
    configureHttpClient({ getToken: () => 'tkn', onUnauthorized });
  });

  it('/api 기준 경로와 Bearer 토큰을 붙인다', async () => {
    const transport = vi.fn().mockResolvedValue(jsonResponse(200, [1]));
    setTransport(transport);
    await expect(request('/ingredients')).resolves.toEqual([1]);
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe('/api/ingredients');
    expect(init.headers.Authorization).toBe('Bearer tkn');
  });

  it('auth:false 요청에는 토큰을 붙이지 않는다', async () => {
    const transport = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    setTransport(transport);
    await request('/auth/login', { method: 'POST', body: { a: 1 }, auth: false });
    const [, init] = transport.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.body).toBe('{"a":1}');
  });

  it('204는 JSON 파싱 없이 null을 반환한다', async () => {
    const res = new Response(null, { status: 204 });
    const jsonSpy = vi.spyOn(res, 'json');
    setTransport(vi.fn().mockResolvedValue(res));
    await expect(request('/ingredients/3', { method: 'DELETE' })).resolves.toBeNull();
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it('error.code/message 계약을 ApiError로 변환한다', async () => {
    setTransport(vi.fn().mockResolvedValue(jsonResponse(409, { error: { code: 'DUPLICATE', message: '중복' } })));
    const err = await request('/auth/signup', { method: 'POST', auth: false }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'DUPLICATE', message: '중복' });
  });

  it('JSON이 아닌 오류 응답도 SERVER_ERROR로 처리한다', async () => {
    setTransport(vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })));
    const err = await request('/rescue').catch((e) => e);
    expect(err).toMatchObject({ status: 502, code: 'SERVER_ERROR' });
  });

  it('성공 응답이 JSON이 아니면 성공으로 취급하지 않는다(SPA HTML 오인 방지)', async () => {
    setTransport(vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })));
    const err = await request('/rescue').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('네트워크 실패는 NETWORK_ERROR', async () => {
    setTransport(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await request('/rescue').catch((e) => e);
    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('보호 요청의 401은 onUnauthorized를 호출한다', async () => {
    setTransport(vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'x' } })));
    await request('/ingredients').catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('로그인(auth:false)의 401은 폼 오류이므로 onUnauthorized를 호출하지 않는다', async () => {
    setTransport(vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'x' } })));
    const err = await request('/auth/login', { method: 'POST', auth: false }).catch((e) => e);
    expect(err.status).toBe(401);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('요청 도중 로그아웃(세션 변경)되면 늦은 응답을 버린다', async () => {
    let resolve;
    setTransport(vi.fn().mockReturnValue(new Promise((r) => { resolve = r; })));
    const pending = request('/ingredients');
    bumpSession();
    resolve(jsonResponse(200, [{ id: 1 }]));
    await expect(pending).rejects.toBeInstanceOf(StaleSessionError);
  });
});

// 2026-10-21 배포 후: Render 무료 서버가 잠들었다 깨는 데 50초+ 걸려 화면이 멈춘 듯 보이던 문제
describe('httpClient 시간 제한·느림 안내·재시도', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('기본값: 시간 제한 70초, 느림 안내 5초, GET 재시도 1초·3초 뒤 두 번', () => {
    expect(HTTP_DEFAULTS).toEqual({ timeoutMs: 70000, slowMs: 5000, retryDelaysMs: [1000, 3000] });
  });

  it('응답이 시간 제한을 넘기면 TIMEOUT(status 0) — transport가 신호를 무시해도 끝난다', async () => {
    vi.useFakeTimers();
    configureHttpClient({ timeoutMs: 70000, retryDelaysMs: [] });
    setTransport(vi.fn(() => new Promise(() => {})));
    const pending = request('/rescue').catch((e) => e);
    await vi.advanceTimersByTimeAsync(69999);
    let settled = false;
    pending.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const err = await pending;
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, code: 'TIMEOUT' });
  });

  it('시간 제한이 되면 transport에 넘긴 signal도 abort된다(실제 fetch 취소)', async () => {
    vi.useFakeTimers();
    configureHttpClient({ timeoutMs: 1000, retryDelaysMs: [] });
    let seen;
    setTransport(vi.fn((url, init) => { seen = init.signal; return new Promise(() => {}); }));
    const pending = request('/rescue').catch((e) => e);
    await vi.advanceTimersByTimeAsync(1000);
    await pending;
    expect(seen.aborted).toBe(true);
  });

  it('부른 쪽이 취소하면 지금처럼 AbortError(조용히 무시 대상)', async () => {
    const controller = new AbortController();
    setTransport(vi.fn((url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const pending = request('/rescue', { signal: controller.signal }).catch((e) => e);
    controller.abort();
    const err = await pending;
    expect(err.name).toBe('AbortError');
  });

  it('5초 넘게 걸리면 느림 안내를 켜고, 끝나면 끈다', async () => {
    vi.useFakeTimers();
    configureHttpClient({ slowMs: 5000 });
    const states = [];
    const off = subscribeSlowRequests((slow) => states.push(slow));
    let resolve;
    setTransport(vi.fn(() => new Promise((r) => { resolve = r; })));
    const pending = request('/rescue');
    await vi.advanceTimersByTimeAsync(4999);
    expect(states).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(states).toEqual([true]);
    resolve(jsonResponse(200, []));
    await pending;
    expect(states).toEqual([true, false]);
    off();
  });

  it('빠른 응답은 안내를 켜지 않는다', async () => {
    vi.useFakeTimers();
    const states = [];
    const off = subscribeSlowRequests((slow) => states.push(slow));
    setTransport(vi.fn().mockResolvedValue(jsonResponse(200, [])));
    await request('/rescue');
    await vi.advanceTimersByTimeAsync(10000);
    expect(states).toEqual([]);
    off();
  });

  it('GET은 연결 실패·502·503·504면 다시 시도한다', async () => {
    configureHttpClient({ retryDelaysMs: [0, 0] });
    const transport = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(503, undefined))
      .mockResolvedValueOnce(jsonResponse(200, [7]));
    setTransport(transport);
    await expect(request('/rescue')).resolves.toEqual([7]);
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it('GET 재시도는 정해진 횟수까지만, 그다음은 마지막 오류', async () => {
    configureHttpClient({ retryDelaysMs: [0, 0] });
    const transport = vi.fn().mockResolvedValue(jsonResponse(502, undefined));
    setTransport(transport);
    const err = await request('/rescue').catch((e) => e);
    expect(err.status).toBe(502);
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it('500·400·401·404는 다시 시도하지 않는다', async () => {
    configureHttpClient({ retryDelaysMs: [0, 0] });
    for (const status of [500, 400, 401, 404]) {
      const transport = vi.fn().mockResolvedValue(jsonResponse(status, { error: { code: 'X', message: 'x' } }));
      setTransport(transport);
      await request('/rescue').catch(() => {});
      expect(transport).toHaveBeenCalledTimes(1);
    }
  });

  it('POST·PATCH·DELETE는 연결 실패여도 다시 보내지 않는다(중복 기록 방지)', async () => {
    configureHttpClient({ retryDelaysMs: [0, 0] });
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      const transport = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      setTransport(transport);
      const err = await request('/recipes/1/cook', { method, body: {} }).catch((e) => e);
      expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
      expect(transport).toHaveBeenCalledTimes(1);
    }
  });

  it('재시도를 기다리는 시간도 전체 시간 제한 안에 든다', async () => {
    vi.useFakeTimers();
    configureHttpClient({ timeoutMs: 2000, retryDelaysMs: [5000] });
    const transport = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    setTransport(transport);
    const pending = request('/rescue').catch((e) => e);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(10000);
    expect(transport).toHaveBeenCalledTimes(1);
  });
});

describe('warmUpServer — 앱을 열자마자 잠든 서버 깨우기', () => {
  it('GET /api/health를 토큰 없이 한 번 보내고, 실패해도 조용히 넘어간다', async () => {
    const transport = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    setTransport(transport);
    await expect(warmUpServer()).resolves.toBeUndefined();
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe('/api/health');
    expect(init.method).toBe('GET');
    expect(init.headers?.Authorization).toBeUndefined();
  });

  it('느림 안내에는 잡히지 않는다(사용자가 기다리는 요청이 아님)', async () => {
    vi.useFakeTimers();
    const states = [];
    const off = subscribeSlowRequests((slow) => states.push(slow));
    setTransport(vi.fn(() => new Promise(() => {})));
    warmUpServer();
    await vi.advanceTimersByTimeAsync(10000);
    expect(states).toEqual([]);
    off();
    vi.useRealTimers();
  });
});
