import { describe, it, expect, vi } from 'vitest';
import { setTransport } from '../../shared/api/httpClient.js';
import { fetchRecipe, fetchRecommendations } from './recipeService.js';

describe('fetchRecommendations', () => {
  it('사용자 결정(2026-10-19): limit 없이 요청한다 — 최대 5개는 서버가 정한다', async () => {
    const transport = vi.fn().mockResolvedValue(new Response('{"key_menus":[],"recipes":[]}', { status: 200 }));
    setTransport(transport);
    await fetchRecommendations();
    expect(transport.mock.calls[0][0]).toBe('/api/recommendations');
  });
});

// 추천 응답 모양 검사(2026-10-19): { key_menus: [], recipes: [] } 두 배열이 모두 있어야 한다.
describe('fetchRecommendations 응답 검사', () => {
  const respond = (body) => setTransport(vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));

  it('key_menus와 recipes가 배열이면 그대로 돌려준다', async () => {
    const body = { key_menus: [{ id: 7 }], recipes: [] };
    respond(body);
    await expect(fetchRecommendations()).resolves.toEqual(body);
  });

  it.each([
    ['옛 배열 응답', [{ id: 1 }]],
    ['key_menus 누락', { recipes: [] }],
    ['recipes가 null', { key_menus: [], recipes: null }],
  ])('%s → INVALID_RESPONSE 오류', async (_label, body) => {
    respond(body);
    await expect(fetchRecommendations()).rejects.toMatchObject({ name: 'ApiError', code: 'INVALID_RESPONSE' });
  });
});

// 상세 응답 모양 검사: ingredients/steps가 배열이 아니면 '해석할 수 없는 응답'(오류)으로 처리한다(사용자 결정 2026-10-15).
describe('fetchRecipe 응답 검사', () => {
  const VALID = { id: 41, title: '두부조림', cook_time_min: 15, ingredients: [], steps: ['썬다'] };
  const respond = (body) => setTransport(vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));

  it('ingredients와 steps가 배열이면 그대로 돌려준다(빈 배열도 정상)', async () => {
    respond(VALID);
    await expect(fetchRecipe(41)).resolves.toEqual(VALID);
  });

  it.each([
    ['steps 누락', { ...VALID, steps: undefined }],
    ['steps null', { ...VALID, steps: null }],
    ['ingredients 누락', { ...VALID, ingredients: undefined }],
    ['ingredients가 객체', { ...VALID, ingredients: {} }],
    ['본문이 배열', [VALID]],
  ])('%s → INVALID_RESPONSE 오류', async (_label, body) => {
    respond(body);
    await expect(fetchRecipe(41)).rejects.toMatchObject({ name: 'ApiError', code: 'INVALID_RESPONSE' });
  });
});

// F13 레시피 검색: GET /recipes/search?q=… → 배열이어야 정상
describe('fetchRecipeSearch', () => {
  it('검색어를 주소에 안전하게 넣어 요청하고 배열을 돌려준다', async () => {
    const { fetchRecipeSearch } = await import('./recipeService.js');
    const transport = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }));
    setTransport(transport);
    await expect(fetchRecipeSearch('김치 & 두부')).resolves.toEqual([]);
    expect(transport.mock.calls[0][0]).toBe('/api/recipes/search?q=%EA%B9%80%EC%B9%98%20%26%20%EB%91%90%EB%B6%80');
  });

  it('배열이 아니면 INVALID_RESPONSE', async () => {
    const { fetchRecipeSearch } = await import('./recipeService.js');
    setTransport(vi.fn().mockResolvedValue(new Response('{"recipes":[]}', { status: 200 })));
    await expect(fetchRecipeSearch('두부')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
