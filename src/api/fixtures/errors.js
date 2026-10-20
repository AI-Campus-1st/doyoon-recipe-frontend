// 공통 오류 응답 본문 — FUNCTIONS.md 오류 계약 { error: { code, message } }
// message는 화면에 그대로 쓰지 않으므로 테스트에서는 의미 없는 값('x')을 넣는다.
export const apiError = (code, message = 'x') => ({ error: { code, message } });

export const SERVER_ERROR = apiError('SERVER_ERROR');
export const UNAUTHORIZED = apiError('UNAUTHORIZED');
export const NOT_FOUND = apiError('NOT_FOUND');
export const DUPLICATE = apiError('DUPLICATE', 'dup');
// 400 — 서버 message는 화면에 쓰지 않는다(사용자 결정 2026-10-19). 쓰이면 테스트가 잡도록 눈에 띄는 문자열을 넣는다.
export const INVALID_INPUT = apiError('INVALID_INPUT', 'SERVER-MESSAGE-SHOULD-NOT-SHOW');
// 400 ALWAYS_OWNED — 양념은 재고로 등록하지 않는다(사용자 결정 2026-10-19)
export const ALWAYS_OWNED = apiError('ALWAYS_OWNED', 'SERVER-MESSAGE-SHOULD-NOT-SHOW');
