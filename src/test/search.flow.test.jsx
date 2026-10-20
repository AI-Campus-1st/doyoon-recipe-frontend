import { describe, it, expect } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp } from './renderApp.jsx';
// 가짜 API 응답 본문은 src/api/fixtures/에 모아 두었다.
import {
  SEARCH_RESULTS, SEARCH_RESULTS_FULL, RECOMMENDATIONS_ONE, RESCUE_EMPTY, SERVER_ERROR,
} from '../api/fixtures/index.js';

const searchCalls = (calls) => calls.filter((c) => c.key === 'GET /recipes/search');

// F13 레시피 검색 화면(/recipes/search) — 요리명·재료명, 내 재고 기준 부족 재료 표시
describe('S7 레시피 검색', () => {
  it('H1은 "레시피 검색" 하나, 처음에는 안내만 보이고 요청하지 않는다', async () => {
    const calls = mockApi({});
    renderApp('/recipes/search');
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['레시피 검색']);
    expect(screen.getByText('요리명이나 재료명으로 찾아보세요.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('빈 검색어·30자 초과는 입력칸 아래 오류, 요청하지 않음', async () => {
    const calls = mockApi({});
    renderApp('/recipes/search');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '검색' }));
    expect(screen.getByText('검색어를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByLabelText('요리명 또는 재료명')).toHaveAttribute('aria-invalid', 'true');
    await user.type(screen.getByLabelText('요리명 또는 재료명'), '가'.repeat(31));
    await user.click(screen.getByRole('button', { name: '검색' }));
    expect(screen.getByText('검색어는 30자 이하로 입력해 주세요.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('검색 → 정리된 검색어로 요청, 서버 순서 그대로 카드, 결과 수 안내, 카드는 상세 링크', async () => {
    const calls = mockApi({ 'GET /recipes/search': () => [200, SEARCH_RESULTS] });
    renderApp('/recipes/search');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('요리명 또는 재료명'), '  두부 {Enter}');
    expect(await screen.findByText('레시피 3개를 찾았어요')).toBeInTheDocument();
    expect(searchCalls(calls)[0].url).toBe(`/api/recipes/search?q=${encodeURIComponent('두부')}`);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/recipes/41', '/recipes/10', '/recipes/42']);
    expect(screen.getByText('임박 재료 사용: 두부')).toBeInTheDocument();
    expect(screen.getByText('부족: 순두부, 애호박')).toBeInTheDocument();
  });

  it('주소의 q로 바로 검색(상세에서 돌아왔을 때 결과 유지), 입력칸에도 채워진다', async () => {
    const calls = mockApi({ 'GET /recipes/search': () => [200, SEARCH_RESULTS] });
    renderApp(`/recipes/search?q=${encodeURIComponent('두부')}`);
    expect(await screen.findByText('두부조림')).toBeInTheDocument();
    expect(screen.getByLabelText('요리명 또는 재료명')).toHaveValue('두부');
    expect(searchCalls(calls)).toHaveLength(1);
  });

  it('결과 0개는 빈 상태(오류와 구분)', async () => {
    mockApi({ 'GET /recipes/search': () => [200, []] });
    renderApp(`/recipes/search?q=${encodeURIComponent('카레')}`);
    expect(await screen.findByText("'카레'에 맞는 레시피가 없어요")).toBeInTheDocument();
    expect(screen.queryByText(/검색하지 못했어요/)).not.toBeInTheDocument();
  });

  it('요청 실패는 오류 + 다시 시도, 같은 검색어로 다시 검색 버튼을 눌러도 재요청', async () => {
    let fail = true;
    const calls = mockApi({ 'GET /recipes/search': () => (fail ? [500, SERVER_ERROR] : [200, SEARCH_RESULTS]) });
    renderApp(`/recipes/search?q=${encodeURIComponent('두부')}`);
    expect(await screen.findByText('검색하지 못했어요.')).toBeInTheDocument();
    fail = false;
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('두부조림')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '검색' }));
    await waitFor(() => expect(searchCalls(calls)).toHaveLength(3));
  });

  it('20개를 꽉 채우면 더 구체적으로 검색하라는 안내', async () => {
    mockApi({ 'GET /recipes/search': () => [200, SEARCH_RESULTS_FULL] });
    renderApp(`/recipes/search?q=${encodeURIComponent('두부')}`);
    expect(await screen.findByText('레시피 20개를 찾았어요')).toBeInTheDocument();
    expect(screen.getByText('결과가 많아 20개까지 보여줘요. 검색어를 더 자세히 입력해 보세요.')).toBeInTheDocument();
  });
});

describe('검색 화면 들어가기', () => {
  it('홈의 "레시피 검색" 버튼', async () => {
    mockApi({ 'GET /rescue': () => [200, RESCUE_EMPTY], 'GET /ingredients': () => [200, []] });
    renderApp('/');
    await userEvent.setup().click(await screen.findByRole('button', { name: '레시피 검색' }));
    expect(await screen.findByRole('heading', { level: 1, name: '레시피 검색' })).toBeInTheDocument();
  });

  it('추천 화면의 "레시피 검색" 버튼', async () => {
    mockApi({ 'GET /recommendations': () => [200, RECOMMENDATIONS_ONE] });
    renderApp('/recommendations');
    await screen.findByText('두부조림');
    await userEvent.setup().click(screen.getByRole('button', { name: '레시피 검색' }));
    const h1 = await screen.findByRole('heading', { level: 1, name: '레시피 검색' });
    expect(within(h1.closest('header')).getByRole('button', { name: '뒤로 가기' })).toBeInTheDocument();
  });
});
