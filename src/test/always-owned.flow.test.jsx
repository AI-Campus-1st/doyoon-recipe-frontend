import { describe, it, expect } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp } from './renderApp.jsx';
import { fetchSeasonings } from '../features/recipes/seasoningService.js';
import { setTransport } from '../shared/api/httpClient.js';

// 가짜 API 응답 본문은 src/api/fixtures/에 모아 두었다.
import {
  SEASONINGS_SAMPLE as SEASONINGS,
  RECOMMENDATIONS_ONE as RECS,
  RECIPE_DETAIL_SIMPLE as RECIPE,
  SERVER_ERROR,
} from '../api/fixtures/index.js';

describe('항상 있다고 보는 재료 — 추천 화면', () => {
  it('안내 문구가 보이고, 열기 전에는 목록을 요청하지 않는다', async () => {
    const calls = mockApi({ 'GET /recommendations': () => [200, RECS] });
    renderApp('/recommendations');
    expect(await screen.findByText('기본 양념과 밥은 집에 있다고 보고 추천해요.')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'GET /seasonings')).toBe(false);
  });

  it('목록 보기 → GET /seasonings 한 번 → 양념과 밥을 나눠 보여 주고, ESC로 닫으면 버튼으로 포커스 복귀', async () => {
    const calls = mockApi({ 'GET /recommendations': () => [200, RECS], 'GET /seasonings': () => [200, SEASONINGS] });
    renderApp('/recommendations');
    const user = userEvent.setup();
    const button = await screen.findByRole('button', { name: '기본 양념·밥 목록 보기' });
    await user.click(button);
    const sheet = await screen.findByRole('dialog', { name: '항상 있다고 보는 재료' });
    const seasoningGroup = await within(sheet).findByRole('list', { name: '양념' });
    expect(within(seasoningGroup).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['간장', '소금']);
    expect(within(within(sheet).getByRole('list', { name: '밥' })).getByText('밥')).toBeInTheDocument();
    expect(calls.filter((c) => c.key === 'GET /seasonings')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('목록 요청 실패는 시트 안 오류 + 다시 시도, 추천 목록은 그대로', async () => {
    let fail = true;
    const calls = mockApi({
      'GET /recommendations': () => [200, RECS],
      'GET /seasonings': () => (fail ? [500, SERVER_ERROR] : [200, SEASONINGS]),
    });
    renderApp('/recommendations');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '기본 양념·밥 목록 보기' }));
    const sheet = await screen.findByRole('dialog', { name: '항상 있다고 보는 재료' });
    expect(await within(sheet).findByText('목록을 불러오지 못했어요.')).toBeInTheDocument();
    expect(screen.getByText('두부조림')).toBeInTheDocument();
    fail = false;
    await user.click(within(sheet).getByRole('button', { name: '다시 시도' }));
    expect(await within(sheet).findByText('간장')).toBeInTheDocument();
    expect(calls.filter((c) => c.key === 'GET /seasonings')).toHaveLength(2);
  });

  it('닫기 버튼으로도 닫힌다', async () => {
    mockApi({ 'GET /recommendations': () => [200, RECS], 'GET /seasonings': () => [200, SEASONINGS] });
    renderApp('/recommendations');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '기본 양념·밥 목록 보기' }));
    const sheet = await screen.findByRole('dialog', { name: '항상 있다고 보는 재료' });
    await within(sheet).findByText('간장');
    await user.click(within(sheet).getAllByRole('button', { name: '닫기' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('항상 있다고 보는 재료 — 레시피 상세', () => {
  it('필요한 재료 아래 안내 + 목록 보기로 같은 시트를 연다', async () => {
    mockApi({ 'GET /recipes/41': () => [200, RECIPE], 'GET /seasonings': () => [200, SEASONINGS] });
    renderApp('/recipes/41');
    expect(await screen.findByText("기본 양념과 밥은 등록하지 않아도 '있어요'로 표시해요.")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '기본 양념·밥 목록 보기' }));
    const sheet = await screen.findByRole('dialog', { name: '항상 있다고 보는 재료' });
    const rice = await within(sheet).findByRole('list', { name: '밥' });
    expect(within(rice).getByText('밥')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['레시피 상세']);
  });
});

describe('seasoningService.fetchSeasonings', () => {
  it('배열이 아닌 응답은 INVALID_RESPONSE 오류', async () => {
    setTransport(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    await expect(fetchSeasonings()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('GET /api/seasonings로 요청한다', async () => {
    let url;
    setTransport(async (u) => {
      url = u;
      return new Response('[]', { status: 200 });
    });
    await expect(fetchSeasonings()).resolves.toEqual([]);
    expect(url).toBe('/api/seasonings');
  });
});
