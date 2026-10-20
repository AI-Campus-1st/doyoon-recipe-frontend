import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp, deferred } from './renderApp.jsx';
import {
  INVENTORY, RESCUE, RESCUE_SHUFFLED, RECOMMENDATIONS_WITH_KEY_MENUS,
} from '../api/fixtures/index.js';

// 2026-10-20 사용자 결정: 홈 추천 레시피·'오늘 뭐 먹지'는 들어올 때마다(서버가 매번 새로 고름) + '다른 메뉴 보기' 버튼
// - 버튼은 그 영역만 다시 부른다(홈 재고 목록은 다시 부르지 않음)
// - 새 메뉴가 올 때까지 지금 메뉴를 그대로 보여 준다(뼈대 화면으로 깜빡이지 않음), 버튼 포커스 유지
const count = (calls, key) => calls.filter((c) => c.key === key).length;

describe('홈 — 추천 레시피 다른 메뉴 보기', () => {
  it('누르면 구조 배너만 다시 불러 새 레시피를 보여 주고, 기다리는 동안 지금 레시피를 유지', async () => {
    const gate = deferred();
    let n = 0;
    const calls = mockApi({
      'GET /rescue': async () => {
        n += 1;
        if (n === 1) return [200, RESCUE];
        await gate.promise;
        return [200, RESCUE_SHUFFLED];
      },
      'GET /ingredients': () => [200, INVENTORY],
    });
    renderApp('/');
    expect(await screen.findByText('두부조림')).toBeInTheDocument();
    const user = userEvent.setup();
    // 2026-10-20 사용자 결정: 추천 화면과 같은 모양 — '추천 레시피' 제목 오른쪽 끝의 작은 새로고침 아이콘 버튼
    const button = screen.getByRole('button', { name: '추천 레시피 다른 메뉴 보기' });
    expect(screen.getByRole('heading', { level: 3, name: '추천 레시피' }).parentElement).toContainElement(button);
    expect(screen.queryByRole('button', { name: '다른 메뉴 보기' })).not.toBeInTheDocument(); // 예전 글자 버튼 없음
    await user.click(button);
    expect(screen.getByText('두부조림')).toBeInTheDocument(); // 응답 전: 지금 메뉴 유지
    expect(screen.getByRole('list', { name: '추천 레시피' })).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true'); // 아이콘 회전
    gate.resolve();
    expect(await screen.findByText('대파계란볶음밥')).toBeInTheDocument();
    expect(screen.queryByText('두부조림')).not.toBeInTheDocument();
    expect(count(calls, 'GET /rescue')).toBe(2);
    expect(count(calls, 'GET /ingredients')).toBe(1);
    expect(button).toHaveFocus();
  });

  it('추천 레시피가 없으면 버튼도 없다', async () => {
    mockApi({ 'GET /rescue': () => [200, { ...RESCUE, recipes: [] }], 'GET /ingredients': () => [200, INVENTORY] });
    renderApp('/');
    await screen.findByText('지금 추천할 레시피가 없어요');
    expect(screen.queryByRole('button', { name: '추천 레시피 다른 메뉴 보기' })).not.toBeInTheDocument();
  });
});

// 2026-10-20 사용자 결정: 추천 화면은 영역별로 — 각 섹션 제목 오른쪽 끝의 작은 새로고침 아이콘 버튼
// 그 영역만 새로 고르고(?section=), 다른 영역에 보이는 레시피는 빼 달라고 보낸다(?exclude=)
const KEY_NEW = { key_menus: [{ id: 9, title: '김치찌개', cook_time_min: 25, score: 0, urgent_used: [], missing: ['김치'] }], recipes: [] };
const REC_NEW = { key_menus: [], recipes: [{ id: 52, title: '대파계란볶음밥', cook_time_min: 10, score: 1, urgent_used: [], missing: [] }] };
const param = (url, name) => new URL(url, 'http://x').searchParams.get(name);

describe('오늘 뭐 먹지 — 영역별 다른 메뉴 보기(제목 오른쪽 아이콘)', () => {
  it('대표 메뉴 버튼: 대표 메뉴만 새로 고르고(일반 추천 id는 제외 요청) 일반 추천은 그대로, 포커스 유지', async () => {
    const gate = deferred();
    const calls = mockApi({
      'GET /recommendations': async (_body, url) => {
        if (!param(url, 'section')) return [200, RECOMMENDATIONS_WITH_KEY_MENUS];
        await gate.promise;
        return [200, KEY_NEW];
      },
    });
    renderApp('/recommendations');
    const keyHeading = await screen.findByRole('heading', { level: 2, name: '자주 해 먹는 대표 메뉴' });
    const button = screen.getByRole('button', { name: '대표 메뉴 다른 메뉴 보기' });
    expect(keyHeading.parentElement).toContainElement(button); // 제목 줄 안(오른쪽 끝)
    const user = userEvent.setup();
    await user.click(button);
    expect(screen.getByText('된장국')).toBeInTheDocument(); // 응답 전: 지금 메뉴 유지
    expect(button).toHaveAttribute('aria-busy', 'true');
    gate.resolve();
    expect(await screen.findByText('김치찌개')).toBeInTheDocument();
    expect(screen.queryByText('된장국')).not.toBeInTheDocument();
    expect(screen.getByText('두부조림')).toBeInTheDocument(); // 일반 추천은 그대로
    const sectionCall = calls.find((c) => c.key === 'GET /recommendations' && param(c.url, 'section'));
    expect(param(sectionCall.url, 'section')).toBe('key_menus');
    expect(param(sectionCall.url, 'exclude')).toBe('41');
    expect(button).toHaveFocus();
  });

  it('간단한 한 끼 버튼: 일반 추천만 새로 고르고(대표 메뉴 id는 제외 요청) 대표 메뉴는 그대로', async () => {
    const calls = mockApi({
      'GET /recommendations': (_body, url) => [200, param(url, 'section') ? REC_NEW : RECOMMENDATIONS_WITH_KEY_MENUS],
    });
    renderApp('/recommendations');
    const mainHeading = await screen.findByRole('heading', { level: 2, name: '내 재료로 만드는 간단한 한 끼' });
    const button = screen.getByRole('button', { name: '간단한 한 끼 다른 메뉴 보기' });
    expect(mainHeading.parentElement).toContainElement(button);
    await userEvent.setup().click(button);
    expect(await screen.findByText('대파계란볶음밥')).toBeInTheDocument();
    expect(screen.queryByText('두부조림')).not.toBeInTheDocument();
    expect(screen.getByText('된장국')).toBeInTheDocument();
    const sectionCall = calls.find((c) => param(c.url, 'section'));
    expect(param(sectionCall.url, 'section')).toBe('recipes');
    expect(param(sectionCall.url, 'exclude')).toBe('7,8');
  });

  it('실패하면 지금 메뉴를 그대로 두고 안내(토스트)만 보여 준다', async () => {
    mockApi({
      'GET /recommendations': (_body, url) => (param(url, 'section') ? [500, { error: { code: 'SERVER_ERROR', message: 'x' } }] : [200, RECOMMENDATIONS_WITH_KEY_MENUS]),
    });
    renderApp('/recommendations');
    await screen.findByText('된장국');
    await userEvent.setup().click(screen.getByRole('button', { name: '대표 메뉴 다른 메뉴 보기' }));
    expect(await screen.findByText('다른 메뉴를 불러오지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('된장국')).toBeInTheDocument();
    expect(screen.getByText('두부조림')).toBeInTheDocument();
  });

  it('맨 아래 큰 다른 메뉴 보기 버튼은 없고, 일반 추천이 비면 그 영역 버튼도 없다', async () => {
    mockApi({ 'GET /recommendations': () => [200, { ...RECOMMENDATIONS_WITH_KEY_MENUS, recipes: [] }] });
    renderApp('/recommendations');
    await screen.findByText('지금 추천할 레시피가 없어요');
    expect(screen.queryByRole('button', { name: '다른 메뉴 보기' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '대표 메뉴 다른 메뉴 보기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '간단한 한 끼 다른 메뉴 보기' })).not.toBeInTheDocument();
  });
});
