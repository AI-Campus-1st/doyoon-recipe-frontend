import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp, deferred } from './renderApp.jsx';
import {
  INVENTORY, RESCUE, RESCUE_SHUFFLED, RECOMMENDATIONS_WITH_KEY_MENUS, RECOMMENDATIONS_SHUFFLED,
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
    const button = screen.getByRole('button', { name: '다른 메뉴 보기' });
    await user.click(button);
    expect(screen.getByText('두부조림')).toBeInTheDocument(); // 응답 전: 지금 메뉴 유지
    expect(screen.getByRole('list', { name: '추천 레시피' })).toHaveAttribute('aria-busy', 'true');
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
    expect(screen.queryByRole('button', { name: '다른 메뉴 보기' })).not.toBeInTheDocument();
  });
});

describe('오늘 뭐 먹지 — 다른 메뉴 보기', () => {
  it('누르면 두 영역 모두 새 메뉴, 기다리는 동안 지금 메뉴 유지, 버튼 포커스 유지', async () => {
    const gate = deferred();
    let n = 0;
    const calls = mockApi({
      'GET /recommendations': async () => {
        n += 1;
        if (n === 1) return [200, RECOMMENDATIONS_WITH_KEY_MENUS];
        await gate.promise;
        return [200, RECOMMENDATIONS_SHUFFLED];
      },
    });
    renderApp('/recommendations');
    expect(await screen.findByText('된장국')).toBeInTheDocument();
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: '다른 메뉴 보기' });
    await user.click(button);
    expect(screen.getByText('된장국')).toBeInTheDocument();
    expect(screen.queryByText('불러오는 중이에요')).not.toBeInTheDocument(); // 뼈대 화면 없음
    gate.resolve();
    expect(await screen.findByText('김치찌개')).toBeInTheDocument();
    expect(screen.getByText('대파계란볶음밥')).toBeInTheDocument();
    expect(screen.queryByText('된장국')).not.toBeInTheDocument();
    expect(count(calls, 'GET /recommendations')).toBe(2);
    expect(button).toHaveFocus();
  });

  it('추천이 하나도 없으면(빈 상태) 다른 메뉴 보기 버튼을 두지 않는다', async () => {
    mockApi({ 'GET /recommendations': () => [200, { key_menus: [], recipes: [] }] });
    renderApp('/recommendations');
    await screen.findByText('지금 추천할 레시피가 없어요');
    expect(screen.queryByRole('button', { name: '다른 메뉴 보기' })).not.toBeInTheDocument();
  });
});
