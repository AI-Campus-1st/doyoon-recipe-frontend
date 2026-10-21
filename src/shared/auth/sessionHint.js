// 로그인 표시 저장소 (localStorage) — 2026-10-21 사용자 결정: 로그인 토큰은 HttpOnly 쿠키로 옮김
// - 무엇을 저장하나: '이 브라우저는 로그인해 있다'는 표시 + 사용자 { id, username }. 비밀이 아니다.
//   진짜 로그인 증명(JWT)은 서버가 HttpOnly 쿠키로 보관하고, 화면 코드는 그 값을 읽을 수 없다(XSS로 훔쳐 갈 수 없음).
// - 왜 표시가 필요한가: 쿠키를 읽을 수 없으니 화면은 로그인 여부를 모른다. 매번 서버에 물어보면(/auth/me)
//   잠든 배포 서버(최대 50초+)를 기다리는 동안 빈 화면이 된다. 그래서 표시를 보고 바로 화면을 그리고,
//   쿠키가 만료됐거나 없으면 첫 보호 요청의 401에서 로그아웃한다(예전 토큰 방식과 같은 흐름).
// - 사용처: AuthProvider만. 사생활 보호 모드 등에서 localStorage가 예외를 던질 수 있어 try/catch로 감싼다.
const KEY = 'recipe.auth.user';
// 전환 전에 쓰던 토큰 저장 키 — 남아 있으면 지운다(사용자 결정: 한 번 다시 로그인)
const LEGACY_TOKEN_KEY = 'recipe.auth.token';

export function readSessionHint() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user && typeof user.username === 'string' ? { id: user.id, username: user.username } : null;
  } catch {
    return null;
  }
}

export function writeSessionHint(user) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ id: user.id, username: user.username }));
  } catch {
    // 저장 실패 시에도 메모리 상태로는 로그인 유지(새로고침하면 다시 로그인 필요)
  }
}

export function clearSessionHint() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}

/** 옛 방식(localStorage에 JWT 보관)으로 저장된 토큰을 지운다. 앱 시작 때 한 번 */
export function removeLegacyToken() {
  try {
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // 무시
  }
}
