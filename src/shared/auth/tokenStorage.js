// JWT 저장소 (localStorage) — 계약: 토큰 7일, localStorage 보관, Bearer 전송 (FUNCTIONS 공통 규칙)
// - 사용처: AuthProvider만 사용한다. 화면/컴포넌트가 localStorage를 직접 만지지 않게 하기 위한 얇은 래퍼.
// - 사생활 보호 모드 등에서 localStorage가 예외를 던질 수 있어 try/catch로 감싼다. 토큰 값은 로그에 남기지 않는다.
const KEY = 'recipe.auth.token';

export function readToken() {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeToken(token) {
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    // 저장 실패 시에도 메모리 상태로는 로그인 유지(새로고침하면 다시 로그인 필요)
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
