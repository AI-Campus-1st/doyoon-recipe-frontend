import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp } from './renderApp.jsx';
import { RECOMMENDATIONS_ONE, RESCUE_EMPTY } from '../api/fixtures/index.js';

// 오류 페이지(2026-10-20 사용자 결정) — 잘못된 주소·화면 오류·없는 레시피는 전체 화면 안내 + 홈으로 가기 / 이전 화면으로
// 서버 500 같은 불러오기 실패는 지금처럼 그 영역에만 '다시 시도'(다른 영역·입력값 유지) — 이 파일 범위 밖
const HOME = { 'GET /rescue': () => [200, RESCUE_EMPTY], 'GET /ingredients': () => [200, []] };

describe('없는 주소', () => {
  it('H1 접근할 수 없는 페이지예요 하나, 안내 문구, 첫 화면이면 이전 화면 버튼 없음', async () => {
    mockApi({});
    renderApp('/no-such-page');
    const h1 = screen.getByRole('heading', { level: 1, name: '접근할 수 없는 페이지예요' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('주소가 잘못되었거나 없어진 페이지예요.')).toBeInTheDocument();
    expect(h1).toHaveFocus(); // 화면 낭독기가 바로 읽도록 제목에 포커스
    expect(screen.queryByRole('button', { name: '이전 화면으로' })).not.toBeInTheDocument();
  });

  it('홈으로 가기 → 내 냉장고', async () => {
    mockApi(HOME);
    renderApp('/recipes/41/oops');
    await userEvent.setup().click(screen.getByRole('button', { name: '홈으로 가기' }));
    expect(await screen.findByRole('heading', { level: 1, name: '내 냉장고' })).toBeInTheDocument();
  });

  it('들어오기 전 화면이 있으면 이전 화면으로 돌아갈 수 있다', async () => {
    mockApi({ 'GET /recommendations': () => [200, RECOMMENDATIONS_ONE] });
    renderApp(['/recommendations', '/nope']);
    await userEvent.setup().click(screen.getByRole('button', { name: '이전 화면으로' }));
    expect(await screen.findByRole('heading', { level: 1, name: '추천 레시피' })).toBeInTheDocument();
  });

  it('로그아웃 상태에서도 안내가 보이고, 홈으로 가기는 로그인 화면으로 이어진다', async () => {
    mockApi({});
    renderApp('/nope', { token: null });
    expect(screen.getByRole('heading', { level: 1, name: '접근할 수 없는 페이지예요' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: '홈으로 가기' }));
    expect(await screen.findByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
  });
});

describe('화면 오류(예상 밖 응답으로 화면이 깨짐)', () => {
  afterEach(() => vi.restoreAllMocks());
  // missing: null → RecipeCard가 null.length를 읽다 오류 → 흰 화면 대신 오류 페이지
  const BROKEN = { key_menus: [], recipes: [{ id: 41, title: '두부조림', cook_time_min: 15, score: 1, urgent_used: [], missing: null }] };

  it('흰 화면 대신 오류 페이지 + 다시 시도·홈으로 가기, 다시 시도하면 화면을 다시 그린다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React가 남기는 오류 로그 숨김
    let broken = true;
    mockApi({ 'GET /recommendations': () => [200, broken ? BROKEN : RECOMMENDATIONS_ONE] });
    renderApp('/recommendations');
    expect(await screen.findByRole('heading', { level: 1, name: '화면을 보여 줄 수 없어요' })).toBeInTheDocument();
    expect(screen.getByText('일시적인 문제일 수 있어요. 다시 시도하거나 홈으로 이동해 주세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '홈으로 가기' })).toBeInTheDocument();
    broken = false;
    await userEvent.setup().click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('두부조림')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '추천 레시피' })).toBeInTheDocument();
  });

  it('홈으로 가기를 누르면 오류가 풀리고 홈이 정상으로 보인다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApi({ ...HOME, 'GET /recommendations': () => [200, BROKEN] });
    renderApp('/recommendations');
    await userEvent.setup().click(await screen.findByRole('button', { name: '홈으로 가기' }));
    expect(await screen.findByRole('heading', { level: 1, name: '내 냉장고' })).toBeInTheDocument();
  });
});
