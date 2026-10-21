import { describe, it, expect } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp } from './renderApp.jsx';
import { RECIPE_SUGGESTIONS, INGREDIENT_SUGGESTIONS, SEARCH_RESULTS, RECIPE_DETAIL, HOME_EMPTY_ROUTES, ONE_TOUCH_SAMPLE, createdIngredient } from '../api/fixtures/index.js';

// 추천 검색어(자동완성) — 2026-10-21 사용자 결정: 화면마다 필요한 것만
//  · 레시피 검색 화면: 레시피(요리명)만, 고르면 바로 상세
//  · 재료 등록 '직접 입력': 재료명만, 고르면 입력칸에 채움(등록은 버튼으로)
// 공통: 최대 8개(서버), 키보드 ↓/↑·Enter·Esc, 빈칸·31자는 요청 안 함, 실패하면 조용히 숨김
const param = (url, name) => new URL(url, 'http://x').searchParams.get(name);
const callsTo = (calls, key) => calls.filter((c) => c.key === key);

describe('레시피 검색 — 추천 검색어(레시피만)', () => {
  const routes = (extra = {}) => ({
    'GET /recipes/suggest': () => [200, RECIPE_SUGGESTIONS],
    'GET /recipes/search': () => [200, SEARCH_RESULTS],
    'GET /recipes/41': () => [200, RECIPE_DETAIL],
    ...extra,
  });

  it('입력하면 레시피 이름만 목록으로 나오고(메뉴·재료 표시 없음), 재료 추천은 요청하지 않는다', async () => {
    const calls = mockApi(routes());
    renderApp('/recipes/search');
    const input = screen.getByRole('combobox', { name: '요리명 또는 재료명' });
    await userEvent.setup().type(input, '두');
    const listbox = await screen.findByRole('listbox', { name: '추천 레시피' });
    expect(within(listbox).getAllByRole('option').map((o) => o.textContent)).toEqual(['두부조림', '순두부찌개', '된장국']);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(param(callsTo(calls, 'GET /recipes/suggest').at(-1).url, 'q')).toBe('두');
    expect(callsTo(calls, 'GET /ingredients/suggest')).toHaveLength(0);
  });

  it('레시피를 누르면 그 상세로 바로 간다', async () => {
    mockApi(routes());
    renderApp('/recipes/search');
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox', { name: '요리명 또는 재료명' }), '두');
    await user.click(await screen.findByRole('option', { name: '두부조림' }));
    expect(await screen.findByRole('heading', { level: 1, name: '레시피 상세' })).toBeInTheDocument();
  });

  it('키보드: ↓로 옮기고 Esc로 닫기, 다시 입력해 ↓ + Enter면 첫 레시피 상세로', async () => {
    mockApi(routes());
    renderApp('/recipes/search');
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: '요리명 또는 재료명' });
    await user.type(input, '두');
    await screen.findByRole('listbox', { name: '추천 레시피' });
    await user.keyboard('{ArrowDown}{ArrowDown}');
    const active = screen.getByRole('option', { name: '순두부찌개' });
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', active.id);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.type(input, '부');
    await screen.findByRole('listbox', { name: '추천 레시피' });
    await user.keyboard('{ArrowDown}{Enter}');
    expect(await screen.findByRole('heading', { level: 1, name: '레시피 상세' })).toBeInTheDocument();
  });

  it('추천을 고르지 않고 Enter면 입력한 말로 그냥 검색하고 목록은 닫힌다', async () => {
    const calls = mockApi(routes());
    renderApp('/recipes/search');
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox', { name: '요리명 또는 재료명' }), '두부{Enter}');
    expect(await screen.findByText('레시피 3개를 찾았어요')).toBeInTheDocument();
    expect(param(callsTo(calls, 'GET /recipes/search')[0].url, 'q')).toBe('두부');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('빈 입력·31자는 추천을 요청하지 않고, 추천 요청이 실패해도 오류 없이 목록만 안 나온다', async () => {
    let fail = false;
    const calls = mockApi(routes({ 'GET /recipes/suggest': () => (fail ? [500, { error: { code: 'SERVER_ERROR', message: 'x' } }] : [200, RECIPE_SUGGESTIONS]) }));
    renderApp('/recipes/search');
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: '요리명 또는 재료명' });
    await user.type(input, '   ');
    await user.clear(input);
    await user.type(input, '가'.repeat(31));
    await new Promise((r) => setTimeout(r, 400));
    expect(callsTo(calls, 'GET /recipes/suggest')).toHaveLength(0);
    fail = true;
    await user.clear(input);
    await user.type(input, '두');
    await waitFor(() => expect(callsTo(calls, 'GET /recipes/suggest').length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/못했어요/)).not.toBeInTheDocument();
  });
});

describe('재료 등록 직접 입력 — 추천 재료명(재료만)', () => {
  const routes = (extra = {}) => ({
    ...HOME_EMPTY_ROUTES,
    'GET /one-touch': () => [200, ONE_TOUCH_SAMPLE],
    'GET /ingredients/suggest': () => [200, INGREDIENT_SUGGESTIONS],
    'POST /ingredients': (body) => [201, createdIngredient(body.name)],
    ...extra,
  });

  it('입력하면 재료명만 목록으로 나오고, 레시피 추천은 요청하지 않는다', async () => {
    const calls = mockApi(routes());
    renderApp('/ingredients/new');
    const input = screen.getByRole('combobox', { name: /재료명/ });
    await userEvent.setup().type(input, '두');
    const listbox = await screen.findByRole('listbox', { name: '추천 재료' });
    expect(within(listbox).getAllByRole('option').map((o) => o.textContent)).toEqual(['두부', '두유', '순두부']);
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(param(callsTo(calls, 'GET /ingredients/suggest').at(-1).url, 'q')).toBe('두');
    expect(callsTo(calls, 'GET /recipes/suggest')).toHaveLength(0);
  });

  it('재료를 누르면 입력칸에 채우고 목록만 닫힌다(바로 등록하지 않음) → 등록 버튼으로 그 이름 등록', async () => {
    const calls = mockApi(routes());
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: /재료명/ });
    await user.type(input, '두');
    await user.click(await screen.findByRole('option', { name: '순두부' }));
    expect(input).toHaveValue('순두부');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(callsTo(calls, 'POST /ingredients')).toHaveLength(0);
    await new Promise((r) => setTimeout(r, 300)); // 채운 뒤 추천이 다시 열리지 않는다
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '재료 등록' }));
    await waitFor(() => expect(callsTo(calls, 'POST /ingredients')).toHaveLength(1));
    expect(callsTo(calls, 'POST /ingredients')[0].body.name).toBe('순두부');
  });

  it('키보드: ↓ + Enter는 항목을 채우기만 하고 폼을 제출하지 않는다', async () => {
    const calls = mockApi(routes());
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: /재료명/ });
    await user.type(input, '두');
    await screen.findByRole('listbox', { name: '추천 재료' });
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(input).toHaveValue('두유');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(callsTo(calls, 'POST /ingredients')).toHaveLength(0);
  });

  it('추천 요청이 실패해도 오류 없이 목록만 안 나오고, 직접 등록은 그대로 된다', async () => {
    const calls = mockApi(routes({ 'GET /ingredients/suggest': () => [500, { error: { code: 'SERVER_ERROR', message: 'x' } }] }));
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: /재료명/ });
    await user.type(input, '두부');
    await waitFor(() => expect(callsTo(calls, 'GET /ingredients/suggest').length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '재료 등록' }));
    await waitFor(() => expect(callsTo(calls, 'POST /ingredients')).toHaveLength(1));
  });
});
