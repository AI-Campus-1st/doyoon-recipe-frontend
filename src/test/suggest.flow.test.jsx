import { describe, it, expect } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp } from './renderApp.jsx';
import { SUGGESTIONS, SEARCH_RESULTS, RECIPE_DETAIL } from '../api/fixtures/index.js';

// 검색어 자동완성(2026-10-20 사용자 결정) — 입력하면 DB의 요리명·재료명 중 맞는 것을 최대 8개 목록으로.
// 메뉴를 고르면 바로 상세, 재료를 고르면 그 재료로 검색. 키보드(위·아래·Enter·Esc)로도 고를 수 있다.
const param = (url, name) => new URL(url, 'http://x').searchParams.get(name);
const suggestCalls = (calls) => calls.filter((c) => c.key === 'GET /recipes/suggest');
const routes = (extra = {}) => ({
  'GET /recipes/suggest': () => [200, SUGGESTIONS],
  'GET /recipes/search': () => [200, SEARCH_RESULTS],
  'GET /recipes/41': () => [200, RECIPE_DETAIL],
  ...extra,
});

describe('레시피 검색 — 추천 검색어', () => {
  it('입력하면 추천 검색어 목록(메뉴·재료 표시)이 나오고, 입력칸은 그 목록을 가리킨다', async () => {
    const calls = mockApi(routes());
    renderApp('/recipes/search');
    const input = screen.getByRole('combobox', { name: '요리명 또는 재료명' });
    await userEvent.setup().type(input, '두');
    const listbox = await screen.findByRole('listbox', { name: '추천 검색어' });
    const options = within(listbox).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['두부재료', '두부조림메뉴', '순두부재료']);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(param(suggestCalls(calls).at(-1).url, 'q')).toBe('두');
  });

  it('메뉴를 누르면 그 레시피 상세로 바로 간다', async () => {
    mockApi(routes());
    renderApp('/recipes/search');
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox', { name: '요리명 또는 재료명' }), '두');
    await user.click(await screen.findByRole('option', { name: /두부조림/ }));
    expect(await screen.findByRole('heading', { level: 1, name: '레시피 상세' })).toBeInTheDocument();
  });

  it('재료를 누르면 입력칸에 채워 그 재료로 검색하고 목록은 닫힌다', async () => {
    const calls = mockApi(routes());
    renderApp('/recipes/search');
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: '요리명 또는 재료명' });
    await user.type(input, '두');
    await user.click(await screen.findByRole('option', { name: /^순두부/ }));
    expect(await screen.findByText('레시피 3개를 찾았어요')).toBeInTheDocument();
    expect(input).toHaveValue('순두부');
    expect(param(calls.find((c) => c.key === 'GET /recipes/search').url, 'q')).toBe('순두부');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('키보드: 아래 화살표로 옮겨 Enter로 고르기, Esc로 닫기', async () => {
    mockApi(routes());
    renderApp('/recipes/search');
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: '요리명 또는 재료명' });
    await user.type(input, '두');
    await screen.findByRole('listbox', { name: '추천 검색어' });
    await user.keyboard('{ArrowDown}{ArrowDown}');
    const active = screen.getByRole('option', { name: /두부조림/ });
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', active.id);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.type(input, '부');
    await screen.findByRole('listbox', { name: '추천 검색어' });
    await user.keyboard('{ArrowDown}{Enter}');
    expect(await screen.findByText('레시피 3개를 찾았어요')).toBeInTheDocument(); // 첫 항목 '두부'(재료)로 검색
    expect(input).toHaveValue('두부');
  });

  it('추천 항목을 고르지 않고 Enter면 입력한 말로 그냥 검색', async () => {
    const calls = mockApi(routes());
    renderApp('/recipes/search');
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox', { name: '요리명 또는 재료명' }), '두부{Enter}');
    expect(await screen.findByText('레시피 3개를 찾았어요')).toBeInTheDocument();
    expect(param(calls.find((c) => c.key === 'GET /recipes/search').url, 'q')).toBe('두부');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('빈 입력·31자는 추천을 요청하지 않고, 추천 요청이 실패해도 오류 없이 목록만 안 나온다', async () => {
    let fail = false;
    const calls = mockApi(routes({ 'GET /recipes/suggest': () => (fail ? [500, { error: { code: 'SERVER_ERROR', message: 'x' } }] : [200, SUGGESTIONS]) }));
    renderApp('/recipes/search');
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: '요리명 또는 재료명' });
    await user.type(input, '   ');
    await user.clear(input);
    await user.type(input, '가'.repeat(31));
    await new Promise((r) => setTimeout(r, 400));
    expect(suggestCalls(calls)).toHaveLength(0);
    fail = true;
    await user.clear(input);
    await user.type(input, '두');
    await waitFor(() => expect(suggestCalls(calls).length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/못했어요/)).not.toBeInTheDocument();
  });
});
