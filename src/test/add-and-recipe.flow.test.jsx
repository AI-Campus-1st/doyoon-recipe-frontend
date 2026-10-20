import { describe, it, expect } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp, deferred } from './renderApp.jsx';
// 가짜 API 응답 본문은 src/api/fixtures/에 모아 두었다.
import {
  ONE_TOUCH_SAMPLE as ONE_TOUCH,
  HOME_EMPTY_ROUTES as HOME,
  createdIngredient,
  RECIPE_DETAIL as RECIPE,
  RECOMMENDATIONS,
  RECOMMENDATIONS_WITH_KEY_MENUS,
  RECOMMENDATIONS_ONLY_KEY_MENUS,
  COOK_DONE_NONE_DELETED,
  SERVER_ERROR,
  NOT_FOUND,
  INVALID_INPUT,
  ALWAYS_OWNED,
} from '../api/fixtures/index.js';

describe('S4 재료 등록', () => {
  it('원터치: 연타해도 POST 1회, name만 전송, 성공 후 홈', async () => {
    const gate = deferred();
    const calls = mockApi({
      ...HOME,
      'GET /one-touch': () => [200, ONE_TOUCH],
      'POST /ingredients': async () => {
        await gate.promise;
        return [201, createdIngredient('대파')];
      },
    });
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    const tile = await screen.findByRole('button', { name: '대파 등록' });
    await user.click(tile);
    await user.click(tile);
    gate.resolve();
    expect(await screen.findByRole('heading', { level: 1, name: '내 냉장고' })).toBeInTheDocument();
    const posts = calls.filter((c) => c.key === 'POST /ingredients');
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ name: '대파' });
    expect(screen.getByText('대파를 등록했어요')).toBeInTheDocument();
  });

  it('category 원문 그룹과 순서', async () => {
    mockApi({ 'GET /one-touch': () => [200, ONE_TOUCH] });
    renderApp('/ingredients/new');
    const groups = await screen.findAllByRole('heading', { level: 3 });
    expect(groups.map((g) => g.textContent)).toEqual(['채소', '두부·콩']);
  });

  it('원터치 목록 실패여도 직접 등록 가능, 날짜 비우면 expiry_date 키 생략', async () => {
    const calls = mockApi({
      ...HOME,
      'GET /one-touch': () => [500, SERVER_ERROR],
      'POST /ingredients': () => [201, createdIngredient('닭다리살')],
    });
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    expect(await screen.findByText('빠른 선택을 불러오지 못했어요.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/재료명/), '닭다리살');
    await user.click(screen.getByRole('button', { name: '재료 등록' }));
    await screen.findByRole('heading', { level: 1, name: '내 냉장고' });
    const post = calls.find((c) => c.key === 'POST /ingredients');
    expect(post.body).toEqual({ name: '닭다리살' });
  });

  it('재료명이 30자를 넘으면 요청하지 않고 오류 문구, 입력은 유지', async () => {
    const calls = mockApi({
      'GET /one-touch': () => [200, ONE_TOUCH],
      'POST /ingredients': () => [201, createdIngredient('x')],
    });
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    const longName = '가'.repeat(31);
    await user.click(screen.getByLabelText(/재료명/));
    await user.paste(longName);
    await user.click(screen.getByRole('button', { name: '재료 등록' }));
    expect(await screen.findByText('재료명은 30자 이하로 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByLabelText(/재료명/)).toHaveValue(longName);
    expect(screen.getByLabelText(/재료명/)).toHaveFocus();
    expect(calls.filter((c) => c.key === 'POST /ingredients')).toHaveLength(0);
  });

  it('등록 400이면 서버 문구 대신 상황별 안내, 입력 유지', async () => {
    mockApi({
      'GET /one-touch': () => [200, ONE_TOUCH],
      'POST /ingredients': () => [400, INVALID_INPUT],
    });
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/재료명/), '닭다리살');
    await user.click(screen.getByRole('button', { name: '재료 등록' }));
    expect(await screen.findByText('재료명과 유통기한을 다시 확인해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText('SERVER-MESSAGE-SHOULD-NOT-SHOW')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/재료명/)).toHaveValue('닭다리살');
  });

  it('양념(400 ALWAYS_OWNED)이면 재료명 칸에 안내, 입력 유지·포커스, 일반 실패 문구는 없음', async () => {
    mockApi({
      'GET /one-touch': () => [200, ONE_TOUCH],
      'POST /ingredients': () => [400, ALWAYS_OWNED],
    });
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/재료명/), '맛간장');
    await user.click(screen.getByRole('button', { name: '재료 등록' }));
    expect(await screen.findByText('양념은 등록하지 않아도 항상 있다고 보고 추천해요.')).toBeInTheDocument();
    expect(screen.getByLabelText(/재료명/)).toHaveValue('맛간장');
    expect(screen.getByLabelText(/재료명/)).toHaveFocus();
    expect(screen.getByLabelText(/재료명/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('재료명과 유통기한을 다시 확인해 주세요.')).not.toBeInTheDocument();
    expect(screen.queryByText('SERVER-MESSAGE-SHOULD-NOT-SHOW')).not.toBeInTheDocument();
  });

  it('직접 등록 실패 시 입력 유지·홈 이동 없음', async () => {
    mockApi({
      'GET /one-touch': () => [200, ONE_TOUCH],
      'POST /ingredients': () => [500, SERVER_ERROR],
    });
    renderApp('/ingredients/new');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/재료명/), '닭다리살');
    await user.type(screen.getByLabelText(/유통기한/), '2026-10-20');
    await user.click(screen.getByRole('button', { name: '재료 등록' }));
    expect(await screen.findByText('재료를 등록하지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.getByLabelText(/재료명/)).toHaveValue('닭다리살');
    expect(screen.getByLabelText(/유통기한/)).toHaveValue('2026-10-20');
    expect(screen.getByRole('heading', { level: 1, name: '재료 등록' })).toBeInTheDocument();
  });
});

describe('S5 추천', () => {
  it('서버 순서 유지, 허용 필드만, 빈 배열은 빈 상태', async () => {
    mockApi({
      'GET /recommendations': () => [200, RECOMMENDATIONS],
    });
    renderApp('/recommendations');
    const links = await screen.findAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/recipes/52', '/recipes/41']);
    expect(screen.getByText('부족: 대파')).toBeInTheDocument();
    expect(screen.getByText('임박 재료 사용: 두부')).toBeInTheDocument();
    expect(screen.queryByText(/9/)).not.toBeInTheDocument(); // score 미노출
  });

  it('추천을 불러오다 연결이 끊기면 연결 확인 문구', async () => {
    mockApi({
      'GET /recommendations': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    renderApp('/recommendations');
    expect(await screen.findByText('인터넷 연결을 확인하고 다시 시도해 주세요.')).toBeInTheDocument();
  });

  it('빈 배열과 오류를 구분', async () => {
    mockApi({ 'GET /recommendations': () => [200, { key_menus: [], recipes: [] }] });
    renderApp('/recommendations');
    expect(await screen.findByText('지금 추천할 레시피가 없어요')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '자주 해 먹는 대표 메뉴' })).not.toBeInTheDocument();
  });

  it('대표 메뉴 영역이 일반 추천 위에 따로 있고, 서버 순서 그대로, 배지 없이 같은 카드로 보인다', async () => {
    mockApi({ 'GET /recommendations': () => [200, RECOMMENDATIONS_WITH_KEY_MENUS] });
    renderApp('/recommendations');
    const keyRegion = await screen.findByRole('region', { name: '자주 해 먹는 대표 메뉴' });
    const mainRegion = screen.getByRole('region', { name: '내 재료로 만드는 간단한 한 끼' });
    expect(within(keyRegion).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/recipes/7', '/recipes/8']);
    expect(within(mainRegion).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/recipes/41']);
    // 대표 메뉴 영역이 먼저(문서 순서)
    expect(keyRegion.compareDocumentPosition(mainRegion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(keyRegion).getByText('부족: 피망')).toBeInTheDocument();
    expect(screen.queryByText(/대표 메뉴$/, { selector: '.badge' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['추천 레시피']);
  });

  it('일반 추천이 비어도 대표 메뉴는 보이고, 일반 영역에는 빈 상태 안내', async () => {
    mockApi({ 'GET /recommendations': () => [200, RECOMMENDATIONS_ONLY_KEY_MENUS] });
    renderApp('/recommendations');
    const keyRegion = await screen.findByRole('region', { name: '자주 해 먹는 대표 메뉴' });
    expect(within(keyRegion).getByRole('link', { name: /된장국/ })).toBeInTheDocument();
    expect(screen.getByText('지금 추천할 레시피가 없어요')).toBeInTheDocument();
  });

  it('응답 모양이 다르면(옛 배열 응답 등) 오류 화면', async () => {
    mockApi({ 'GET /recommendations': () => [200, [{ id: 1, title: '옛 응답', cook_time_min: 5, urgent_used: [], missing: [] }]] });
    renderApp('/recommendations');
    expect(await screen.findByText('추천을 불러오지 못했어요.')).toBeInTheDocument();
  });
});

describe('S6 상세 + 요리 완료', () => {
  it('H1 고정, 음식명 H2, 보유/부족 문구, 단계 순서', async () => {
    mockApi({ 'GET /recipes/41': () => [200, RECIPE] });
    renderApp('/recipes/41');
    expect(await screen.findByRole('heading', { level: 2, name: '두부조림' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['레시피 상세']);
    expect(screen.getAllByText('있어요')).toHaveLength(2);
    expect(screen.getByText('부족해요')).toBeInTheDocument();
    const stepList = document.querySelector('ol.detail__steps');
    expect([...stepList.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['1두부를 썬다', '2양념을 끓인다']);
    expect(screen.getByText('약 15분 · 2인분')).toBeInTheDocument();
  });

  it('응답에 조리 단계가 빠지면 화면이 깨지지 않고 오류 + 다시 시도, 재시도 성공 시 표시', async () => {
    let attempt = 0;
    mockApi({
      'GET /recipes/41': () => {
        attempt += 1;
        return [200, attempt === 1 ? { ...RECIPE, steps: undefined } : RECIPE];
      },
    });
    renderApp('/recipes/41');
    expect(await screen.findByText('레시피를 불러오지 못했어요.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '요리 완료' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('heading', { level: 2, name: '두부조림' })).toBeInTheDocument();
  });

  it('404는 찾을 수 없음 화면', async () => {
    mockApi({ 'GET /recipes/999': () => [404, NOT_FOUND] });
    renderApp('/recipes/999');
    expect(await screen.findByText('레시피를 찾을 수 없어요')).toBeInTheDocument();
  });

  it('숫자가 아닌 주소(/recipes/abc → 400)도 찾을 수 없음 화면, 같은 결과뿐인 다시 시도 버튼은 없음', async () => {
    mockApi({ 'GET /recipes/abc': () => [400, INVALID_INPUT] });
    renderApp('/recipes/abc');
    expect(await screen.findByText('레시피를 찾을 수 없어요')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '추천 목록으로' })).toBeInTheDocument();
  });

  it('상세를 불러오다 연결이 끊기면 연결 확인 문구 + 다시 시도', async () => {
    mockApi({
      'GET /recipes/41': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    renderApp('/recipes/41');
    expect(await screen.findByText('인터넷 연결을 확인하고 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('요리 완료 404(그새 다른 곳에서 재료를 지움): 모달을 닫고 안내 후 상세를 다시 불러온다', async () => {
    const calls = mockApi({
      'GET /recipes/41': () => [200, RECIPE],
      'POST /recipes/41/cook': () => [404, NOT_FOUND],
    });
    renderApp('/recipes/41');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '요리 완료' }));
    const dialog = await screen.findByRole('dialog', { name: '요리 완료' });
    await user.click(within(dialog).getByRole('checkbox', { name: '두부' }));
    await user.click(within(dialog).getByRole('button', { name: '요리 완료하고 정리하기' }));
    expect(await screen.findByText('이미 냉장고에서 빠진 재료가 있어요. 다시 골라 주세요.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(calls.filter((c) => c.key === 'GET /recipes/41')).toHaveLength(2));
    expect(await screen.findByRole('button', { name: '요리 완료' })).toBeInTheDocument();
  });

  it('요리 완료 중 연결이 끊기면 모달 안에 연결 확인 문구, 선택 유지', async () => {
    mockApi({
      'GET /recipes/41': () => [200, RECIPE],
      'POST /recipes/41/cook': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    renderApp('/recipes/41');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '요리 완료' }));
    const dialog = await screen.findByRole('dialog', { name: '요리 완료' });
    await user.click(within(dialog).getByRole('checkbox', { name: '두부' }));
    await user.click(within(dialog).getByRole('button', { name: '요리 완료하고 정리하기' }));
    expect(await within(dialog).findByText('인터넷 연결을 확인하고 다시 시도해 주세요.')).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: '두부' })).toBeChecked();
  });

  it('후보는 실제 재고만, 기본 체크 없음, 0개로도 확인 → 빈 배열 POST → 홈', async () => {
    const calls = mockApi({
      ...HOME,
      'GET /recipes/41': () => [200, RECIPE],
      'POST /recipes/41/cook': () => [200, COOK_DONE_NONE_DELETED],
    });
    renderApp('/recipes/41');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '요리 완료' }));
    const dialog = await screen.findByRole('dialog', { name: '요리 완료' });
    const boxes = within(dialog).getAllByRole('checkbox');
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).not.toBeChecked();
    expect(within(dialog).getByText('재료를 삭제하지 않고 요리 기록만 남겨요')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '요리 완료하고 정리하기' }));
    await screen.findByRole('heading', { level: 1, name: '내 냉장고' });
    expect(calls.find((c) => c.key === 'POST /recipes/41/cook').body).toEqual({ used_ingredient_ids: [] });
  });

  it('완료 실패 시 모달과 선택 유지', async () => {
    mockApi({
      'GET /recipes/41': () => [200, RECIPE],
      'POST /recipes/41/cook': () => [500, SERVER_ERROR],
    });
    renderApp('/recipes/41');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '요리 완료' }));
    const dialog = await screen.findByRole('dialog', { name: '요리 완료' });
    await user.click(within(dialog).getByRole('checkbox', { name: '두부' }));
    await user.click(within(dialog).getByRole('button', { name: '요리 완료하고 정리하기' }));
    expect(await within(dialog).findByText('요리 완료를 저장하지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: '두부' })).toBeChecked();
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '요리 완료하고 정리하기' })).toBeEnabled());
  });
});

describe('S6 완성 사진', () => {
  it('image_url이 있으면 제목 위에 완성 사진을 보여주고, 실패하면 숨기되 레시피는 유지', async () => {
    const { fireEvent } = await import('@testing-library/react');
    mockApi({ 'GET /recipes/41': () => [200, { ...RECIPE, image_url: 'https://example.com/dubu.jpg' }] });
    renderApp('/recipes/41');
    const img = await screen.findByRole('img', { name: '두부조림 완성 사진' });
    expect(img).toHaveAttribute('src', 'https://example.com/dubu.jpg');
    const title = screen.getByRole('heading', { level: 2, name: '두부조림' });
    expect(img.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.error(img);
    expect(screen.queryByRole('img', { name: '두부조림 완성 사진' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '두부조림' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('image_url이 null이면 사진 영역이 없다', async () => {
    mockApi({ 'GET /recipes/41': () => [200, RECIPE] });
    renderApp('/recipes/41');
    await screen.findByRole('heading', { level: 2, name: '두부조림' });
    expect(screen.queryByRole('img', { name: /완성 사진/ })).not.toBeInTheDocument();
  });
});
