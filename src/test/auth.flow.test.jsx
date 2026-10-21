import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp, deferred } from './renderApp.jsx';
// 가짜 API 응답 본문은 src/api/fixtures/에 모아 두었다.
import { LOGIN_SUCCESS, HOME_EMPTY_ROUTES, RESCUE_EMPTY, UNAUTHORIZED, DUPLICATE, INVALID_INPUT } from '../api/fixtures/index.js';

const TOO_MANY = { error: { code: 'TOO_MANY_REQUESTS', message: 'SERVER-MESSAGE-SHOULD-NOT-SHOW' } };

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

  it('429(로그인 시도 횟수 초과)면 잠시 후 다시 시도 안내(2026-10-21)', async () => {
    mockApi({ 'POST /auth/login': () => [429, TOO_MANY] });
    renderApp('/login', { token: null });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('아이디'), 'cook01');
    await user.type(screen.getByLabelText('비밀번호'), 'password1');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText('SERVER-MESSAGE-SHOULD-NOT-SHOW')).not.toBeInTheDocument();
    expect(screen.getByLabelText('아이디')).toHaveValue('cook01');
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
    // 토큰은 저장하지 않고(HttpOnly 쿠키), 로그인했다는 표시(비밀 아님)만 남긴다
    expect(window.localStorage.getItem('recipe.auth.token')).toBeNull();
    expect(JSON.parse(window.localStorage.getItem('recipe.auth.user'))).toEqual({ id: 1, username: 'cook01' });
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

  it('429(가입 시도 횟수 초과)면 잠시 후 다시 시도 안내(2026-10-21)', async () => {
    mockApi({ 'POST /auth/signup': () => [429, TOO_MANY] });
    renderApp('/signup', { token: null });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('아이디'), 'cook01');
    await user.type(screen.getByLabelText('비밀번호'), 'password1');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password1');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(await screen.findByText('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
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
  it('로그인 표시가 없으면 /login으로', () => {
    mockApi({});
    renderApp('/', { token: null });
    expect(screen.getByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
  });

  it('보호 API 401이면 로그인 표시를 지우고 로그인으로 이동', async () => {
    mockApi({
      'GET /rescue': () => [401, UNAUTHORIZED],
      'GET /ingredients': () => [200, []],
    });
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem('recipe.auth.user')).toBeNull());
  });

  // 새로고침: 로그인 표시가 있으면 서버 확인을 기다리지 않고 바로 보호 화면을 그린다(잠든 서버를 50초 기다리지 않게).
  // 요청에는 쿠키가 같이 가고(credentials) Authorization 헤더는 없다. 쿠키가 만료됐으면 첫 요청의 401로 로그인 화면.
  it('새로고침 직후에도 로그인 상태가 유지되고, 요청은 쿠키로 보낸다(Authorization 없음)', async () => {
    const calls = mockApi({
      'GET /rescue': () => [200, RESCUE_EMPTY],
      'GET /ingredients': () => [200, []],
    });
    renderApp('/');
    expect(await screen.findByText('아직 등록한 재료가 없어요')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '내 냉장고' })).toBeInTheDocument();
    expect(calls).toHaveLength(2);
    for (const c of calls) expect(c.headers.Authorization).toBeUndefined();
    expect(calls.every((c) => c.credentials === 'same-origin')).toBe(true);
  });

  // 전환 전에 로그인해 둔 사용자(사용자 결정: 한 번 다시 로그인): 옛 localStorage 토큰은 지우고 로그인 화면으로
  it('옛 방식 토큰(localStorage)만 있으면 지우고 로그인 화면으로', () => {
    mockApi({});
    window.localStorage.setItem('recipe.auth.token', 'old-jwt');
    renderApp('/', { token: null });
    expect(screen.getByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
    expect(window.localStorage.getItem('recipe.auth.token')).toBeNull();
  });
});

describe('로그아웃(F02)', () => {
  it('서버에 로그아웃(쿠키 삭제)을 요청하고, 로그인 표시를 지운 뒤 로그인 화면으로', async () => {
    const calls = mockApi({
      'GET /rescue': () => [200, RESCUE_EMPTY],
      'GET /ingredients': () => [200, []],
      'POST /auth/logout': () => [204, null],
    });
    renderApp('/');
    const user = userEvent.setup();
    await screen.findByText('아직 등록한 재료가 없어요');
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
    expect(calls.filter((c) => c.key === 'POST /auth/logout')).toHaveLength(1);
    expect(window.localStorage.getItem('recipe.auth.user')).toBeNull();
  });

  it('로그아웃 요청이 실패해도(연결 끊김) 화면은 로그아웃된다', async () => {
    mockApi({
      'GET /rescue': () => [200, RESCUE_EMPTY],
      'GET /ingredients': () => [200, []],
      'POST /auth/logout': () => { throw new TypeError('Failed to fetch'); },
    });
    renderApp('/');
    const user = userEvent.setup();
    await screen.findByText('아직 등록한 재료가 없어요');
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
    expect(window.localStorage.getItem('recipe.auth.user')).toBeNull();
  });
});
