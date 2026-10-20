import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, setTransport, ApiError, StaleSessionError, configureHttpClient, bumpSession } from './httpClient.js';

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
