// 인증 API 서비스 (페이지 → 서비스 → httpClient)
// - auth:false: 토큰 없이 보내고, 401(자격 오류)을 '폼 오류'로 돌려받는다(로그인 화면 리다이렉트 아님).
// - signup은 username/password만 보낸다(비밀번호 확인값은 서버로 보내지 않음).
import { request } from '../../shared/api/httpClient.js';

export function login({ username, password }) {
  return request('/auth/login', { method: 'POST', body: { username, password }, auth: false });
}

export function signup({ username, password }) {
  return request('/auth/signup', { method: 'POST', body: { username, password }, auth: false });
}
