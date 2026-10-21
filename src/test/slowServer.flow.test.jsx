// 2026-10-21 배포 후: 잠든 서버(Render 무료)를 기다리는 동안 '깨우는 중' 안내를 보여 준다
import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp, deferred } from './renderApp.jsx';
import { configureHttpClient } from '../shared/api/httpClient.js';
import { LOGIN_SUCCESS, HOME_EMPTY_ROUTES } from '../api/fixtures/index.js';

const NOTICE = '서버를 깨우는 중이에요. 처음 접속하면 1분 정도 걸릴 수 있어요.';

describe('느린 서버 안내', () => {
  it('로그인 응답이 늦으면 안내가 뜨고, 응답이 오면 사라진다', async () => {
    configureHttpClient({ slowMs: 30 });
    const gate = deferred();
    mockApi({ 'POST /auth/login': () => gate.promise, ...HOME_EMPTY_ROUTES });
    renderApp('/login', { token: null });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('아이디'), 'cook01');
    await user.type(screen.getByLabelText('비밀번호'), 'password1');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();
    gate.resolve([200, LOGIN_SUCCESS]);
    await waitFor(() => expect(screen.queryByText(NOTICE)).not.toBeInTheDocument());
  });

  it('시간 제한을 넘기면 서버가 늦다는 문구(인터넷 탓 아님)', async () => {
    configureHttpClient({ timeoutMs: 50, retryDelaysMs: [] });
    mockApi({ 'GET /recommendations': () => new Promise(() => {}) });
    renderApp('/recommendations');
    expect(await screen.findByText('서버 응답이 늦어요. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
  });
});
