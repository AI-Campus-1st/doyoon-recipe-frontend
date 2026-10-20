// 재료(재고) 관련 응답: GET /ingredients, GET /rescue, GET /one-touch, POST /ingredients 등

// GET /ingredients — 만료·임박·주의·여유 4상태 + 같은 이름(두부) 2행을 모두 담은 재고
export const INVENTORY = [
  { id: 1, name: '우유', storage: 'fridge', expiry_date: '2026-10-13', d_day: -2, status: 'expired' },
  { id: 2, name: '대파', storage: 'fridge', expiry_date: '2026-10-15', d_day: 0, status: 'urgent' },
  { id: 3, name: '두부', storage: 'fridge', expiry_date: '2026-10-16', d_day: 1, status: 'urgent' },
  { id: 4, name: '두부', storage: 'fridge', expiry_date: '2026-10-19', d_day: 4, status: 'warning' },
  { id: 5, name: '양파', storage: 'fridge', expiry_date: '2026-10-25', d_day: 10, status: 'ok' },
];

// GET /rescue — 임박 재료가 있을 때
export const RESCUE = {
  items: [{ id: 2, name: '대파', d_day: 0 }, { id: 3, name: '두부', d_day: 1 }],
  recipes: [{ id: 41, title: '두부조림', cook_time_min: 15 }],
  message: '오늘 먼저 써보세요',
};

// GET /rescue — 같은 재고로 다시 불렀을 때 다른 추천 레시피(2026-10-20: 부를 때마다 새 메뉴)
export const RESCUE_SHUFFLED = {
  ...RESCUE,
  recipes: [{ id: 52, title: '대파계란볶음밥', cook_time_min: 10 }, { id: 63, title: '두부된장국', cook_time_min: 20 }],
};

// GET /rescue — 임박 재료가 없을 때(정상 빈 상태)
export const RESCUE_EMPTY = { items: [], recipes: [], message: '여유 있어요' };

// 홈 화면이 처음 부르는 두 요청을 '빈 상태'로 응답하는 라우트 묶음.
// 다른 화면에서 성공 후 홈으로 이동하는 흐름 테스트에서 펼쳐(...HOME_EMPTY_ROUTES) 쓴다.
export const HOME_EMPTY_ROUTES = {
  'GET /rescue': () => [200, RESCUE_EMPTY],
  'GET /ingredients': () => [200, []],
};

// GET /one-touch — 그룹 순서(채소 → 두부·콩) 확인용 3개 샘플
export const ONE_TOUCH_SAMPLE = [
  { name: '대파', category: '채소', fridge_days: 7 },
  { name: '양파', category: '채소', fridge_days: 14 },
  { name: '두부', category: '두부·콩', fridge_days: 5 },
];

// POST /ingredients 201 응답 — 등록한 이름만 바꿔 쓴다
export const createdIngredient = (name) => ({
  id: 9, name, storage: 'fridge', expiry_date: '2026-10-22', d_day: 7, status: 'ok',
});

// DELETE /ingredients/expired 응답
export const EXPIRED_DELETED_ONE = { deleted: 1 };
