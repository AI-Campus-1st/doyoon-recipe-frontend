import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp } from './renderApp.jsx';
import { RECIPE_DETAIL as RECIPE, HOME_EMPTY_ROUTES as HOME, ONE_TOUCH_SAMPLE as ONE_TOUCH, createdIngredient, COOK_DONE_NONE_DELETED } from '../api/fixtures/index.js';

// 결과를 모를 때 다시 누른 요청의 중복 방지(2026-10-21) — 화면은 같은 요청에 같은 Idempotency-Key를 붙여 보낸다.
const keyOf = (call) => call.headers['Idempotency-Key'];
const failNetwork = () => {
  throw new TypeError('Failed to fetch'); // 응답을 못 받음 = 서버가 처리했는지 모름
};

describe('요리 완료 중복 방지', () => {
  beforeEach(() => window.sessionStorage.clear());

  async function confirmCook(user) {
    await user.click(await screen.findByRole('button', { name: '요리 완료' }));
    const dialog = await screen.findByRole('dialog', { name: '요리 완료' });
    await user.click(within(dialog).getByRole('button', { name: '요리 완료하고 정리하기' }));
    return dialog;
  }

  it('연결이 끊긴 뒤 다시 누르면 같은 키로 보내고, 성공 후 다음 요리는 새 키', async () => {
    let attempt = 0;
    const calls = mockApi({
      ...HOME,
      'GET /recipes/41': () => [200, RECIPE],
      'POST /recipes/41/cook': () => {
        attempt += 1;
        if (attempt === 1) failNetwork();
        return [200, COOK_DONE_NONE_DELETED];
      },
    });
    const view = renderApp('/recipes/41');
    const user = userEvent.setup();
    const dialog = await confirmCook(user);
    expect(await within(dialog).findByText('인터넷 연결을 확인하고 다시 시도해 주세요.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '요리 완료하고 정리하기' }));
    await screen.findByRole('heading', { level: 1, name: '내 냉장고' });
    const posts = calls.filter((c) => c.key === 'POST /recipes/41/cook');
    expect(posts).toHaveLength(2);
    expect(keyOf(posts[0])).toMatch(/^[0-9a-f-]{36}$/);
    expect(keyOf(posts[1])).toBe(keyOf(posts[0]));

    view.unmount();
    renderApp('/recipes/41');
    await confirmCook(user);
    await screen.findByRole('heading', { level: 1, name: '내 냉장고' });
    const all = calls.filter((c) => c.key === 'POST /recipes/41/cook');
    expect(keyOf(all[2])).not.toBe(keyOf(posts[0]));
  });

  it('결과를 모른 채 새로고침해도(sessionStorage) 같은 키로 다시 보낸다', async () => {
    let attempt = 0;
    const calls = mockApi({
      ...HOME,
      'GET /recipes/41': () => [200, RECIPE],
      'POST /recipes/41/cook': () => {
        attempt += 1;
        if (attempt === 1) failNetwork();
        return [200, COOK_DONE_NONE_DELETED];
      },
    });
    const user = userEvent.setup();
    const first = renderApp('/recipes/41');
    const dialog = await confirmCook(user);
    await within(dialog).findByText('인터넷 연결을 확인하고 다시 시도해 주세요.');
    first.unmount(); // 새로고침처럼 화면을 새로 그림(메모리 상태는 사라지고 sessionStorage만 남음)
    renderApp('/recipes/41');
    await confirmCook(user);
    await screen.findByRole('heading', { level: 1, name: '내 냉장고' });
    const posts = calls.filter((c) => c.key === 'POST /recipes/41/cook');
    expect(keyOf(posts[0])).toMatch(/^[0-9a-f-]{36}$/);
    expect(keyOf(posts[1])).toBe(keyOf(posts[0]));
  });
});

describe('재료 등록 중복 방지', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('연결이 끊긴 뒤 다시 등록하면 같은 키, 확실한 실패(400) 뒤에는 새 키', async () => {
    let attempt = 0;
    const calls = mockApi({
      ...HOME,
      'GET /one-touch': () => [200, ONE_TOUCH],
      'POST /ingredients': (body) => {
        attempt += 1;
        if (attempt === 1) failNetwork();
        if (attempt === 2) return [400, { error: { code: 'INVALID_INPUT', message: 'x' } }];
        return [201, createdIngredient(body.name)];
      },
    });
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    const name = await screen.findByLabelText(/재료명/);
    await user.type(name, '버터');
    const submit = screen.getByRole('button', { name: '재료 등록' });
    await user.click(submit);
    await screen.findByText('인터넷 연결을 확인하고 다시 시도해 주세요.');
    await user.click(submit); // 같은 키로 다시 → 이번엔 400(서버가 처리 안 함 → 키 버림)
    await screen.findByText('재료명과 유통기한을 다시 확인해 주세요.');
    await user.click(submit); // 새 키
    await screen.findByRole('heading', { level: 1, name: '내 냉장고' });
    const posts = calls.filter((c) => c.key === 'POST /ingredients');
    expect(posts).toHaveLength(3);
    expect(keyOf(posts[0])).toMatch(/^[0-9a-f-]{36}$/);
    expect(keyOf(posts[1])).toBe(keyOf(posts[0]));
    expect(keyOf(posts[2])).not.toBe(keyOf(posts[1]));
  });

  it('원터치도 같은 재료를 다시 누르면(결과 모를 때) 같은 키, 다른 재료는 다른 키', async () => {
    let attempt = 0;
    const calls = mockApi({
      ...HOME,
      'GET /one-touch': () => [200, ONE_TOUCH],
      'POST /ingredients': (body) => {
        attempt += 1;
        if (attempt <= 2) failNetwork();
        return [201, createdIngredient(body.name)];
      },
    });
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    const first = ONE_TOUCH[0].name;
    const second = ONE_TOUCH[1].name;
    await user.click(await screen.findByRole('button', { name: new RegExp(first) }));
    await screen.findByText('인터넷 연결을 확인하고 다시 시도해 주세요.');
    await user.click(screen.getByRole('button', { name: new RegExp(first) }));
    await waitFor(() => expect(calls.filter((c) => c.key === 'POST /ingredients')).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: new RegExp(second) }));
    await screen.findByRole('heading', { level: 1, name: '내 냉장고' });
    const posts = calls.filter((c) => c.key === 'POST /ingredients');
    expect(keyOf(posts[0])).toMatch(/^[0-9a-f-]{36}$/);
    expect(keyOf(posts[1])).toBe(keyOf(posts[0]));
    expect(keyOf(posts[2])).not.toBe(keyOf(posts[0]));
  });
});
