// POST /api/auth/login · /signup 성공 응답 — 2026-10-21부터 토큰은 HttpOnly 쿠키로 오고 본문에는 user만
export const LOGIN_SUCCESS = { user: { id: 1, username: 'cook01' } };
