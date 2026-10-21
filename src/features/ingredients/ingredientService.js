// 재고·구조 배너·원터치 API 서비스 — 경로/메서드/본문 계약을 한 곳에 모은다 (FUNCTIONS §3)
// - 호출자: HomePage, AddIngredientPage(원터치·등록·추천 재료명). 응답 필드는 가공하지 않고 그대로 돌려준다(서버가 정렬·상태 계산의 주인).
import { ApiError, request } from '../../shared/api/httpClient.js';
import { withIdempotencyKey, IDEMPOTENCY_HEADER } from '../../shared/api/idempotencyKeys.js';

export const fetchIngredients = (signal) => request('/ingredients', { signal });
export const fetchRescue = (signal) => request('/rescue', { signal });
export const fetchOneTouch = (signal) => request('/one-touch', { signal });

// 직접 입력 추천 재료명(2026-10-21): GET /ingredients/suggest?q=… → [{ type:'ingredient', label }] (최대 8개, 양념 제외, 서버가 정렬)
// - 배열이 아니면 INVALID_RESPONSE로 실패 처리(화면은 조용히 목록을 숨긴다)
export const fetchIngredientSuggestions = (query, signal) =>
  request(`/ingredients/suggest?q=${encodeURIComponent(query)}`, { signal }).then((data) => {
    if (!Array.isArray(data)) throw new ApiError({ status: 200, code: 'INVALID_RESPONSE', message: '응답을 해석하지 못했어요.' });
    return data;
  });

// body는 ingredientForm.buildCreateIngredientBody 결과({name} 또는 {name, expiry_date})
// 재료 등록(직접 입력·원터치 공통): 결과를 모른 채 다시 누르면 같은 Idempotency-Key로 보내 중복 등록을 막는다(2026-10-21).
// 키는 '이름 + 날짜'마다 하나 — 성공하면 버리므로, 같은 재료를 일부러 한 번 더 등록하면 새 키(별도 행)로 들어간다.
export const createIngredient = (body) =>
  withIdempotencyKey(`ingredient:${body.name}|${body.expiry_date ?? ''}`, (key) =>
    request('/ingredients', { method: 'POST', body, headers: { [IDEMPOTENCY_HEADER]: key } }));

// 편집은 expiry_date만 보낸다
export const updateIngredientExpiry = (id, expiryDate) =>
  request(`/ingredients/${id}`, { method: 'PATCH', body: { expiry_date: expiryDate } });

// 204 빈 응답 → null
export const deleteIngredient = (id) => request(`/ingredients/${id}`, { method: 'DELETE' });

// 200 { deleted }
export const deleteExpiredIngredients = () => request('/ingredients/expired', { method: 'DELETE' });
