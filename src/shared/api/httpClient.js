// 공통 HTTP 클라이언트 — 모든 API 요청이 지나가는 단 하나의 통로
// - 역할: /api 기준 경로, Authorization: Bearer 헤더, 응답 상태/오류 형식 처리, 401 처리, 로그아웃 후 늦은 응답 차단.
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

// 테스트 전용 초기화 — 이 파일의 설정(transport·토큰 읽기·401 처리·세션 번호)은 모듈 전역이라
// 앞 테스트에서 등록한 값이 다음 테스트로 새어 나간다. src/test/setup.js가 매 테스트 뒤에 호출해
// "앞 테스트 덕분에 우연히 통과"하는 일을 막는다. 앱 코드에서는 호출하지 않는다.
export function resetHttpClientForTest() {
  transport = defaultTransport;
  getToken = () => null;
  onUnauthorized = () => {};
  sessionVersion = 0;
}

export function setTransport(fn) {
  transport = fn;
}

export function configureHttpClient(options) {
  if (options.getToken) getToken = options.getToken;
  if (options.onUnauthorized) onUnauthorized = options.onUnauthorized;
}

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
 * @param {{method?: string, body?: unknown, auth?: boolean, signal?: AbortSignal}} options
 *   auth=false: 로그인/가입처럼 토큰 없이 보내고, 401을 '폼 오류'로 돌려준다.
 */
export async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const startedVersion = sessionVersion;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await transport(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: '서버에 연결하지 못했어요.' });
  }

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

export function isIgnorableError(error) {
  return error instanceof StaleSessionError || error?.name === 'AbortError';
}
