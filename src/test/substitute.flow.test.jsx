// '대체' 표시(2026-10-20 사용자 결정): 레시피 재료를 넓은 이름 재고로 대신하는 경우(예: 레시피 대파 ← 재고 파)
// - 추천·검색 카드: '대체: 대파 대신 파' 한 줄(부족 줄과 별개)
// - 상세: 그 재료 줄에 '대체 가능' 배지 + '가진 재료: 파', 요리 완료 후보에 '파 (대파 대신)'
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp } from './renderApp.jsx';

const card = (id, title, extra = {}) => ({ id, title, cook_time_min: 10, score: 1, urgent_used: [], missing: [], substitutes: [], ...extra });

describe('대체 표시', () => {
  it('추천 카드: substitutes가 있으면 "대체: 대파 대신 파", 없으면 대체 줄 없음', async () => {
    mockApi({
      'GET /recommendations': () => [200, {
        key_menus: [],
        recipes: [
          card(1, '두부조림'),
          card(2, '대파계란볶음', { missing: ['계란'], substitutes: [{ name: '대파', stock_name: '파' }, { name: '표고버섯', stock_name: '버섯' }] }),
        ],
      }],
    });
    renderApp('/recommendations');
    const second = await screen.findByRole('link', { name: /대파계란볶음/ });
    expect(within(second).getByText('대체: 대파 대신 파, 표고버섯 대신 버섯')).toBeInTheDocument();
    expect(within(second).getByText('부족: 계란')).toBeInTheDocument();
    const first = screen.getByRole('link', { name: /두부조림/ });
    expect(within(first).queryByText(/^대체:/)).not.toBeInTheDocument();
  });

  it('상세: 대체 재료는 "대체 가능" + 가진 재료 이름, 요리 완료 후보는 "파 (대파 대신)"', async () => {
    mockApi({
      'GET /recipes/50': () => [200, {
        id: 50, title: '대파계란볶음', cook_time_min: 10, servings: '1인분', image_url: null,
        ingredients: [
          { name: '대파', amount: '1대', is_seasoning: false, owned: true, my_ingredient_id: 9, substitute: '파' },
          { name: '계란', amount: '2개', is_seasoning: false, owned: true, my_ingredient_id: 4, substitute: null },
        ],
        steps: ['볶는다'],
      }],
    });
    renderApp('/recipes/50');
    await screen.findByRole('heading', { level: 2, name: '대파계란볶음' });
    const rows = document.querySelectorAll('.detail__ingredient');
    expect(within(rows[0]).getByText('대체 가능')).toBeInTheDocument();
    expect(within(rows[0]).getByText('가진 재료: 파')).toBeInTheDocument();
    expect(within(rows[1]).getByText('있어요')).toBeInTheDocument();
    expect(within(rows[1]).queryByText(/가진 재료/)).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '요리 완료' }));
    const dialog = await screen.findByRole('dialog', { name: '요리 완료' });
    expect(within(dialog).getByRole('checkbox', { name: '파 (대파 대신)' })).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: '계란' })).toBeInTheDocument();
  });
});
