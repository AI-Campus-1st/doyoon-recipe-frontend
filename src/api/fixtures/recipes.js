// 레시피 관련 응답: GET /recommendations, GET /recipes/:id, POST /recipes/:id/cook

// GET /recipes/41 — 보유(두부, 실제 재고 id 3)·부족(대파)·양념(간장, 가상 보유)을 모두 담은 상세
export const RECIPE_DETAIL = {
  id: 41, title: '두부조림', cook_time_min: 15, servings: '2인분', image_url: null,
  ingredients: [
    { name: '두부', amount: '1모', is_seasoning: false, owned: true, my_ingredient_id: 3 },
    { name: '대파', amount: '1/2대', is_seasoning: false, owned: false, my_ingredient_id: null },
    { name: '간장', amount: '2큰술', is_seasoning: true, owned: true, my_ingredient_id: null },
  ],
  steps: ['두부를 썬다', '양념을 끓인다'],
};

// GET /recipes/41 — 부족 재료 없이 짧은 상세(양념 안내 시트 테스트용)
export const RECIPE_DETAIL_SIMPLE = {
  id: 41, title: '두부조림', cook_time_min: 15, servings: '2인분', image_url: null,
  ingredients: [
    { name: '두부', amount: '1모', is_seasoning: false, owned: true, my_ingredient_id: 3 },
    { name: '간장', amount: '2큰술', is_seasoning: true, owned: true, my_ingredient_id: null },
  ],
  steps: ['두부를 썬다'],
};

// GET /recommendations 응답 = { key_menus: 대표 메뉴(최대 3), recipes: 일반 추천(최대 5) } (2026-10-19 사용자 결정)
// 서버가 정한 순서를 화면이 그대로 지키는지 확인(점수 9가 먼저여도 서버 순서 우선)
export const RECOMMENDATIONS = {
  key_menus: [],
  recipes: [
    { id: 52, title: '계란볶음밥', cook_time_min: 10, score: 9, urgent_used: [], missing: ['대파'] },
    { id: 41, title: '두부조림', cook_time_min: 15, score: 1, urgent_used: ['두부'], missing: [] },
  ],
};

// GET /recommendations — 일반 추천 1개짜리
export const RECOMMENDATIONS_ONE = {
  key_menus: [],
  recipes: [
    { id: 41, title: '두부조림', cook_time_min: 15, score: 1, urgent_used: [], missing: [] },
  ],
};

// GET /recommendations — 대표 메뉴 영역 + 일반 추천(대표 메뉴로 뽑힌 레시피는 일반 추천에 없음)
export const RECOMMENDATIONS_WITH_KEY_MENUS = {
  key_menus: [
    { id: 7, title: '된장국', cook_time_min: 20, score: 1.5, urgent_used: ['두부'], missing: [] },
    { id: 8, title: '고추잡채', cook_time_min: 25, score: -1, urgent_used: [], missing: ['피망'] },
  ],
  recipes: [
    { id: 41, title: '두부조림', cook_time_min: 15, score: 1, urgent_used: [], missing: [] },
  ],
};

// GET /recommendations — 다시 불렀을 때 두 영역 모두 다른 메뉴(2026-10-20: 부를 때마다 새 메뉴)
export const RECOMMENDATIONS_SHUFFLED = {
  key_menus: [{ id: 9, title: '김치찌개', cook_time_min: 25, score: 0, urgent_used: [], missing: ['김치'] }],
  recipes: [{ id: 52, title: '대파계란볶음밥', cook_time_min: 10, score: 1, urgent_used: [], missing: [] }],
};

// GET /recommendations — 일반 추천은 비었지만 대표 메뉴는 있음
export const RECOMMENDATIONS_ONLY_KEY_MENUS = {
  key_menus: [{ id: 7, title: '된장국', cook_time_min: 20, score: 1.5, urgent_used: [], missing: ['두부'] }],
  recipes: [],
};

// POST /recipes/41/cook — 재료를 하나도 지우지 않고 기록만 남긴 경우
export const COOK_DONE_NONE_DELETED = { deleted: 0, history_id: 1 };

// GET /recipes/search?q=두부 — 서버가 정한 순서(요리명 일치 먼저 → 부족 적은 순 → 가나다)
export const SEARCH_RESULTS = [
  { id: 41, title: '두부조림', cook_time_min: 15, urgent_used: ['두부'], missing: [] },
  { id: 10, title: '순두부찌개', cook_time_min: 20, urgent_used: [], missing: ['순두부', '애호박'] },
  { id: 42, title: '된장국', cook_time_min: 20, urgent_used: [], missing: ['애호박'] },
];

// GET /recipes/search — 최대 개수(20개)를 꽉 채운 결과
export const SEARCH_RESULTS_FULL = Array.from({ length: 20 }, (_, i) => ({
  id: 100 + i, title: `두부요리 ${i + 1}`, cook_time_min: 10, urgent_used: [], missing: [],
}));

// GET /recipes/suggest?q=두 — 검색어 자동완성(2026-10-20): 요리명(type recipe, id)·재료명(type ingredient)
export const SUGGESTIONS = [
  { type: 'ingredient', label: '두부' },
  { type: 'recipe', id: 41, label: '두부조림' },
  { type: 'ingredient', label: '순두부' },
];
