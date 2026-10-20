import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp, deferred } from './renderApp.jsx';
// 가짜 API 응답 본문은 src/api/fixtures/에 모아 두었다.
import { LOGIN_SUCCESS, HOME_EMPTY_ROUTES, RESCUE_EMPTY, UNAUTHORIZED, DUPLICATE, INVALID_INPUT } from '../api/fixtures/index.js';

describe('S1 로그인', () => {
  it('H1은 정확히 "로그인" 하나', () => {
    mockApi({});
    renderApp('/login', { token: null });
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('로그인');
  });

  it('401이면 폼 오류를 보여주고 아이디는 유지, 로그인 화면에 남는다', async () => {
    mockApi({ 'POST /auth/login': () => [401, UNAUTHORIZED] });
    renderApp('/login', { token: null });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('아이디'), 'cook01');
    await user.type(screen.getByLabelText('비밀번호'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('아이디 또는 비밀번호를 확인해 주세요.')).toBeInTheDocument();
    expect(screen.getByLabelText('아이디')).toHaveValue('cook01');
  });

  it('400이면 서버 문구 대신 상황별 안내', async () => {
    mockApi({ 'POST /auth/login': () => [400, INVALID_INPUT] });
    renderApp('/login', { token: null });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('아이디'), 'cook01');
    await user.type(screen.getByLabelText('비밀번호'), 'password1');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('아이디와 비밀번호를 다시 확인해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText('SERVER-MESSAGE-SHOULD-NOT-SHOW')).not.toBeInTheDocument();
  });

  it('요청 중 연타해도 한 번만 전송하고, 성공하면 username/password만 보낸 뒤 홈으로 간다', async () => {
    const gate = deferred();
    const calls = mockApi({
      'POST /auth/login': async () => {
        await gate.promise;
        return [200, LOGIN_SUCCESS];
      },
      ...HOME_EMPTY_ROUTES,
    });
    renderApp('/login', { token: null });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('아이디'), 'cook01');
    await user.type(screen.getByLabelText('비밀번호'), 'password1');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    await user.click(screen.getByRole('button', { name: /로그인 중/ }));
    gate.resolve();
    expect(await screen.findByRole('heading', { level: 1, name: '내 냉장고' })).toBeInTheDocument();
    const loginCalls = calls.filter((c) => c.key === 'POST /auth/login');
    expect(loginCalls).toHaveLength(1);
    expect(loginCalls[0].body).toEqual({ username: 'cook01', password: 'password1' });
    expect(window.localStorage.getItem('recipe.auth.token')).toBe('t');
  });
});

describe('S2 회원가입', () => {
  it('확인값은 보내지 않고, 409면 아이디 아래 중복 오류', async () => {
    const calls = mockApi({ 'POST /auth/signup': () => [409, DUPLICATE] });
    renderApp('/signup', { token: null });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('아이디'), 'cook01');
    await user.type(screen.getByLabelText('비밀번호'), 'password1');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password1');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(await screen.findByText('이미 사용 중인 아이디예요.')).toBeInTheDocument();
    expect(calls[0].body).toEqual({ username: 'cook01', password: 'password1' });
  });

  it('400이면 서버 문구 대신 상황별 안내, 입력 유지', async () => {
    mockApi({ 'POST /auth/signup': () => [400, INVALID_INPUT] });
    renderApp('/signup', { token: null });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('아이디'), 'cook01');
    await user.type(screen.getByLabelText('비밀번호'), 'password1');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password1');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(await screen.findByText('아이디와 비밀번호 형식을 다시 확인해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText('SERVER-MESSAGE-SHOULD-NOT-SHOW')).not.toBeInTheDocument();
    expect(screen.getByLabelText('아이디')).toHaveValue('cook01');
  });

  it('비밀번호에 공백이 있으면 비밀번호 칸 아래 오류, 요청하지 않음(사용자 결정 2026-10-20)', async () => {
    const calls = mockApi({});
    renderApp('/signup', { token: null });
    const user = userEvent.setup();
    expect(screen.getByText('공백 없이 8자 이상 입력해 주세요.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('아이디'), 'cook01');
    await user.type(screen.getByLabelText('비밀번호'), 'pass word1');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'pass word1');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText('비밀번호에는 공백을 넣을 수 없어요.')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toHaveLength(0);
  });

  it('형식 오류면 요청하지 않는다', async () => {
    const calls = mockApi({});
    renderApp('/signup', { token: null });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('아이디'), 'ab');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText('아이디는 영문·숫자 4~20자로 입력해 주세요.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});

describe('보호 라우트와 401', () => {
  it('토큰이 없으면 /login으로', () => {
    mockApi({});
    renderApp('/', { token: null });
    expect(screen.getByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
  });

  it('보호 API 401이면 토큰을 지우고 로그인으로 이동', async () => {
    mockApi({
      'GET /rescue': () => [401, UNAUTHORIZED],
      'GET /ingredients': () => [200, []],
    });
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem('recipe.auth.token')).toBeNull());
  });

  // 회귀 테스트: 새로고침(저장된 토큰으로 앱 첫 렌더) 직후의 첫 보호 요청에도 Bearer 토큰이 붙어야 한다.
  // 실제 서버처럼 토큰이 없으면 401을 돌려주게 해서, 버그가 있으면 로그인 화면으로 튕기는지 확인한다.
  it('새로고침 직후 첫 요청에도 토큰을 보내 로그인 상태가 유지된다', async () => {
    const calls = mockApi({
      'GET /rescue': () =>
        calls.at(-1).headers.Authorization === 'Bearer stored-token'
          ? [200, RESCUE_EMPTY]
          : [401, UNAUTHORIZED],
      'GET /ingredients': () =>
        calls.at(-1).headers.Authorization === 'Bearer stored-token'
          ? [200, []]
          : [401, UNAUTHORIZED],
    });
    renderApp('/', { token: 'stored-token' });
    expect(await screen.findByText('아직 등록한 재료가 없어요')).toBeInTheDocument();
    expect(calls.map((c) => c.headers.Authorization)).toEqual(['Bearer stored-token', 'Bearer stored-token']);
    expect(screen.getByRole('heading', { level: 1, name: '내 냉장고' })).toBeInTheDocument();
    expect(window.localStorage.getItem('recipe.auth.token')).toBe('stored-token');
  });
});
