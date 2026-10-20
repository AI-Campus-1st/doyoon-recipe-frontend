// 재고·구조 배너·원터치 API 서비스 — 경로/메서드/본문 계약을 한 곳에 모은다 (FUNCTIONS §3)
// - 호출자: HomePage, AddIngredientPage. 응답 필드는 가공하지 않고 그대로 돌려준다(서버가 정렬·상태 계산의 주인).
import { request } from '../../shared/api/httpClient.js';

export const fetchIngredients = (signal) => request('/ingredients', { signal });
export const fetchRescue = (signal) => request('/rescue', { signal });
export const fetchOneTouch = (signal) => request('/one-touch', { signal });

// body는 ingredientForm.buildCreateIngredientBody 결과({name} 또는 {name, expiry_date})
export const createIngredient = (body) => request('/ingredients', { method: 'POST', body });

// 편집은 expiry_date만 보낸다
export const updateIngredientExpiry = (id, expiryDate) =>
  request(`/ingredients/${id}`, { method: 'PATCH', body: { expiry_date: expiryDate } });

// 204 빈 응답 → null
export const deleteIngredient = (id) => request(`/ingredients/${id}`, { method: 'DELETE' });

// 200 { deleted }
export const deleteExpiredIngredients = () => request('/ingredients/expired', { method: 'DELETE' });
