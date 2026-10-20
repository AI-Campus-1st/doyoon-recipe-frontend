// 테스트 도우미: 가짜 transport로 API 응답을 정하고 MemoryRouter로 앱을 렌더한다.
// routes: { 'GET /rescue': (body) => [status, json] , ... } — 호출 기록은 calls 배열에 남는다.
// - key는 쿼리 문자열을 뺀 경로, url은 쿼리 문자열까지 포함한 실제 요청 주소(검색어 확인용).
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AppRoutes } from '../app/App.jsx';
import { setTransport } from '../shared/api/httpClient.js';

export function mockApi(routes) {
  const calls = [];
  const transport = vi.fn(async (url, init) => {
    const key = `${init.method} ${url.replace(/^\/api/, '').replace(/\?.*$/, '')}`;
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ key, url, body, headers: init.headers });
    const handler = routes[key];
    if (!handler) return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: key } }), { status: 404 });
    const result = await handler(body);
    const [status, json] = result;
    return new Response(status === 204 ? null : JSON.stringify(json), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  setTransport(transport);
  return calls;
}

export function renderApp(path, { token = 'test-token' } = {}) {
  if (token) window.localStorage.setItem('recipe.auth.token', token);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

export function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
