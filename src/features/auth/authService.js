// 인증 API 서비스 (페이지 → 서비스 → httpClient)
// - 2026-10-21: 성공 응답 본문은 { user }만. 로그인 토큰은 서버가 HttpOnly 쿠키로 심는다(화면은 토큰을 모름).
// - auth:false: 401(자격 오류)을 '폼 오류'로 돌려받는다(로그인 화면 리다이렉트 아님).
// - signup은 username/password만 보낸다(비밀번호 확인값은 서버로 보내지 않음).
import { request } from '../../shared/api/httpClient.js';

export function login({ username, password }) {
  return request('/auth/login', { method: 'POST', body: { username, password }, auth: false });
}

export function signup({ username, password }) {
  return request('/auth/signup', { method: 'POST', body: { username, password }, auth: false });
}

// 로그아웃: 서버가 로그인 쿠키를 지운다(204). AuthProvider.logout이 결과를 기다리지 않고 부른다.
export function logout() {
  return request('/auth/logout', { method: 'POST', auth: false });
}
