// 추천·상세·요리 완료 API 서비스
// - 추천 개수: 최대 5개는 서버가 정한다(사용자 결정 2026-10-15). 2026-10-19 사용자 결정으로 limit 파라미터를 없앴다
//   — 부르는 곳이 추천 화면 하나뿐이라 화면이 개수를 보낼 이유가 없고, 잘못된 값이 들어올 통로도 사라진다.
import { ApiError, request } from '../../shared/api/httpClient.js';
import { buildCookBody } from './cookCandidates.js';

// 추천 응답 = { key_menus: 대표 메뉴(최대 3), recipes: 일반 추천(최대 5) } (2026-10-19 사용자 결정)
// - 두 배열이 모두 있어야 정상. 옛 배열 응답·빠진 필드는 추측해 채우지 않고 오류 화면('추천을 불러오지 못했어요.')으로.
export function assertRecommendationPage(data) {
  const ok =
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Array.isArray(data.key_menus) &&
    Array.isArray(data.recipes);
  if (!ok) {
    throw new ApiError({ status: 200, code: 'INVALID_RESPONSE', message: '응답을 해석하지 못했어요.' });
  }
  return data;
}

export const fetchRecommendations = (signal) =>
  request('/recommendations', { signal }).then(assertRecommendationPage);

// 검색(F13): GET /recipes/search?q=… → 배열(최대 20개, 서버가 정렬). 배열이 아니면 오류 화면으로.
// - encodeURIComponent: '김치 & 두부'처럼 공백·&가 든 검색어도 q 값 하나로 전달되게 한다(안 하면 &에서 잘림).
export function assertSearchResults(data) {
  if (!Array.isArray(data)) {
    throw new ApiError({ status: 200, code: 'INVALID_RESPONSE', message: '응답을 해석하지 못했어요.' });
  }
  return data;
}

export const fetchRecipeSearch = (query, signal) =>
  request(`/recipes/search?q=${encodeURIComponent(query)}`, { signal }).then(assertSearchResults);

// 상세 응답 모양 검사(사용자 결정 2026-10-15: 빠진 응답은 '오류'로 처리)
// - 왜: RecipeDetailPage가 ingredients/steps를 .map으로 그리므로 둘 중 하나라도 배열이 아니면 화면 전체가 깨졌다.
// - 반쪽짜리 레시피를 정상처럼 보여 주지 않고, 기존 오류 화면('레시피를 불러오지 못했어요.' + 다시 시도)으로 보낸다.
// - 빈 배열은 형식상 정상으로 통과시킨다(내용 검수는 서버·시드 검증의 몫). 필드를 추측해 채우지 않는다.
export function assertRecipeDetail(data) {
  const ok =
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Array.isArray(data.ingredients) &&
    Array.isArray(data.steps);
  if (!ok) {
    throw new ApiError({ status: 200, code: 'INVALID_RESPONSE', message: '응답을 해석하지 못했어요.' });
  }
  return data;
}

export const fetchRecipe = (id, signal) =>
  request(`/recipes/${encodeURIComponent(id)}`, { signal }).then(assertRecipeDetail);

// 200 { deleted, history_id } — 선택 삭제 + 기록 저장은 서버가 하나의 트랜잭션으로 처리
export const cookRecipe = (id, selectedIds) =>
  request(`/recipes/${encodeURIComponent(id)}/cook`, { method: 'POST', body: buildCookBody(selectedIds) });
