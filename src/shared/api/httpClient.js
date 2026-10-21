// 공통 HTTP 클라이언트 — 모든 API 요청이 지나가는 단 하나의 통로
// - 역할: /api 기준 경로, Authorization: Bearer 헤더, 응답 상태/오류 형식 처리, 401 처리, 로그아웃 후 늦은 응답 차단.
// - 2026-10-21(배포 후): 배포 서버(Render 무료)는 15분 쉬면 잠들고 깨는 데 50초+ 걸린다. 그래서
//   ① 시간 제한(기본 70초, 넘으면 ApiError code TIMEOUT) ② 5초 넘게 걸리면 '느림' 알림(subscribeSlowRequests → 화면 안내)
//   ③ GET만 연결 실패·502·503·504일 때 1초·3초 뒤 다시 시도(데이터를 바꾸는 요청은 중복될 수 있어 다시 보내지 않음)
//   ④ warmUpServer: 앱을 열자마자 /api/health를 한 번 보내 서버를 미리 깨운다.
// - 호출자: features/*/xxxService.js (페이지 → 서비스 → 여기). UI 컴포넌트는 직접 호출하지 않는다.
// - 연결: AuthProvider가 configureHttpClient로 토큰 읽기/401 처리 함수를 등록한다.
//   개발용 목업 모드(main.jsx)는 setTransport로 fetch 대신 가짜 서버를 끼운다.

const BASE = '/api';

// 서버 오류 계약 { error: { code, message } }를 담는 오류 객체
export class ApiError extends Error {
  constructor({ status, code, message }) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0이면 네트워크 실패(응답 없음)
    this.code = code;
  }
}

// 로그아웃 등으로 세션이 바뀐 뒤 도착한 응답. 화면은 이 오류를 조용히 무시한다.
export class StaleSessionError extends Error {
  constructor() {
    super('stale session');
    this.name = 'StaleSessionError';
  }
}

const defaultTransport = (url, init) => fetch(url, init);
let transport = defaultTransport;
let getToken = () => null;
let onUnauthorized = () => {};
let sessionVersion = 0;

// 시간 관련 기본값(위 설명 ①②③). configureHttpClient로 바꿀 수 있다(테스트는 짧게).
export const HTTP_DEFAULTS = Object.freeze({ timeoutMs: 70000, slowMs: 5000, retryDelaysMs: [1000, 3000] });
let timing = { ...HTTP_DEFAULTS };
const RETRY_STATUSES = new Set([502, 503, 504]); // 앞단 프록시가 '서버가 아직 준비 안 됨'으로 돌려주는 상태

// 느린 요청 알림: 5초 넘게 기다리는 요청이 하나라도 있으면 true, 모두 끝나면 false
const slowListeners = new Set();
let slowCount = 0;
function changeSlowCount(delta) {
  const before = slowCount > 0;
  slowCount += delta;
  const after = slowCount > 0;
  if (before !== after) slowListeners.forEach((fn) => fn(after));
}
/** 느린 요청 상태가 바뀔 때마다 fn(isSlow)을 부른다. 돌려준 함수를 부르면 구독 해제 */
export function subscribeSlowRequests(fn) {
  slowListeners.add(fn);
  return () => slowListeners.delete(fn);
}

// 테스트 전용 초기화 — 이 파일의 설정(transport·토큰 읽기·401 처리·세션 번호)은 모듈 전역이라
// 앞 테스트에서 등록한 값이 다음 테스트로 새어 나간다. src/test/setup.js가 매 테스트 뒤에 호출해
// "앞 테스트 덕분에 우연히 통과"하는 일을 막는다. 앱 코드에서는 호출하지 않는다.
export function resetHttpClientForTest() {
  transport = defaultTransport;
  getToken = () => null;
  onUnauthorized = () => {};
  sessionVersion = 0;
  timing = { ...HTTP_DEFAULTS };
  slowListeners.clear();
  slowCount = 0;
}

export function setTransport(fn) {
  transport = fn;
}

export function configureHttpClient(options) {
  if (options.getToken) getToken = options.getToken;
  if (options.onUnauthorized) onUnauthorized = options.onUnauthorized;
  if (options.timeoutMs !== undefined) timing.timeoutMs = options.timeoutMs;
  if (options.slowMs !== undefined) timing.slowMs = options.slowMs;
  if (options.retryDelaysMs !== undefined) timing.retryDelaysMs = options.retryDelaysMs;
}

// 앱 시작 때 한 번: 잠든 배포 서버를 미리 깨운다(사용자가 로그인 정보를 입력하는 동안 깨어남).
// 결과는 쓰지 않고 실패도 무시한다. 사용자가 기다리는 요청이 아니므로 느림 안내·재시도·시간 제한 없음.
export async function warmUpServer() {
  try {
    await transport(`${BASE}/health`, { method: 'GET', headers: { Accept: 'application/json' } });
  } catch {
    // 조용히 무시
  }
}

class TimeoutSignal extends Error {}
const wait = (ms, signal) => new Promise((resolve, reject) => {
  const id = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(id); reject(signal.reason); }, { once: true });
});

// 로그아웃/401 시 호출: 그 전에 시작된 요청의 응답은 모두 버려진다.
export function bumpSession() {
  sessionVersion += 1;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * @param {string} path '/ingredients' 처럼 /api 이후 경로
 * @param {{method?: string, body?: unknown, auth?: boolean, signal?: AbortSignal, headers?: Record<string,string>}} options
 *   auth=false: 로그인/가입처럼 토큰 없이 보내고, 401을 '폼 오류'로 돌려준다.
 *   headers: 더 붙일 헤더(예: Idempotency-Key — shared/api/idempotencyKeys.js)
 */
export async function request(path, { method = 'GET', body, auth = true, signal, headers: extraHeaders } = {}) {
  const startedVersion = sessionVersion;
  const headers = { Accept: 'application/json', ...extraHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await sendWithTimeout(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }, signal);

  if (auth && startedVersion !== sessionVersion) throw new StaleSessionError();

  if (response.status === 204) return null; // 개별 삭제 성공: 본문이 없으므로 파싱하지 않는다

  const data = await readJson(response);

  if (!response.ok) {
    if (response.status === 401 && auth) {
      bumpSession();
      onUnauthorized();
    }
    throw new ApiError({
      status: response.status,
      code: data?.error?.code ?? 'SERVER_ERROR',
      message: data?.error?.message ?? '문제가 발생했어요.',
    });
  }

  // 성공 코드인데 JSON이 아니면(예: SPA fallback HTML) 성공 데이터로 취급하지 않는다.
  if (data === undefined) {
    throw new ApiError({ status: response.status, code: 'INVALID_RESPONSE', message: '응답을 해석하지 못했어요.' });
  }
  return data;
}

// 한 요청 전체(재시도 대기 포함)를 timing.timeoutMs 안에 끝낸다. 부른 쪽 signal 취소는 AbortError 그대로.
async function sendWithTimeout(url, init, callerSignal) {
  if (callerSignal?.aborted) throw new DOMException('aborted', 'AbortError');
  const controller = new AbortController();
  const timeoutReason = new TimeoutSignal('timeout');
  const onCallerAbort = () => controller.abort(callerSignal.reason ?? new DOMException('aborted', 'AbortError'));
  callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

  // transport가 signal을 무시해도(테스트용 가짜 등) 시간 제한은 반드시 끝나도록 경쟁시킨다
  let timeoutId;
  const timedOut = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort(timeoutReason);
      reject(timeoutReason);
    }, timing.timeoutMs);
  });
  let slowMarked = false;
  const slowId = setTimeout(() => { slowMarked = true; changeSlowCount(1); }, timing.slowMs);

  const canRetry = (init.method ?? 'GET').toUpperCase() === 'GET';
  const attempt = async () => {
    for (let i = 0; ; i += 1) {
      const delay = canRetry ? timing.retryDelaysMs[i] : undefined;
      let response;
      try {
        response = await transport(url, { ...init, signal: controller.signal });
      } catch (error) {
        if (controller.signal.aborted) throw controller.signal.reason;
        if (error?.name === 'AbortError') throw error;
        if (delay === undefined) {
          throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: '서버에 연결하지 못했어요.' });
        }
        await wait(delay, controller.signal);
        continue;
      }
      if (RETRY_STATUSES.has(response.status) && delay !== undefined) {
        await wait(delay, controller.signal);
        continue;
      }
      return response;
    }
  };

  try {
    const attempting = attempt();
    attempting.catch(() => {}); // 시간 제한이 먼저 끝난 뒤 늦게 실패해도 처리되지 않은 거부로 남지 않게
    return await Promise.race([attempting, timedOut]);
  } catch (error) {
    if (error === timeoutReason || error instanceof TimeoutSignal) {
      throw new ApiError({ status: 0, code: 'TIMEOUT', message: '서버 응답이 너무 늦어요.' });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    clearTimeout(slowId);
    if (slowMarked) changeSlowCount(-1);
    callerSignal?.removeEventListener('abort', onCallerAbort);
    timedOut.catch(() => {}); // 경쟁에서 진 시간 제한 promise의 거부를 처리된 것으로 표시
  }
}

export function isIgnorableError(error) {
  return error instanceof StaleSessionError || error?.name === 'AbortError';
}
