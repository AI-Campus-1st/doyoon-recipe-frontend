// 레시피 검색어 검사 (순수 함수) — F13
// - 사용처: RecipeSearchPage.jsx(검색 버튼·Enter 제출 때). 통과한 검색어만 주소(?q=)와 API로 보낸다.
// - 서버 domain/recipeSearch.js normalizeSearchQuery와 같은 기준이라, 화면에서 걸러진 값은 서버에서 400이 나지 않는다.
//   NFC(조합형 한글 → 완성형) → 앞뒤 공백 제거 → 연속 공백 하나로 → 1~30자([...문자열]로 세서 이모지도 1자)
export const SEARCH_QUERY_MAX = 30;

export function validateSearchQuery(raw) {
  const query = String(raw ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!query) return { query: null, error: '검색어를 입력해 주세요.' };
  if ([...query].length > SEARCH_QUERY_MAX) return { query: null, error: `검색어는 ${SEARCH_QUERY_MAX}자 이하로 입력해 주세요.` };
  return { query, error: null };
}
