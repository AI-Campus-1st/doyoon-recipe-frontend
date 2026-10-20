// 요리 완료 모달의 '다 쓴 재료' 후보 계산 (순수 함수)
// - 역할: 레시피 상세 응답 ingredients[] 중 실제 냉장고 재고와 연결된 항목만 체크 후보로 만든다.
// - 사용처: features/recipes/components/CookDoneModal.jsx
// - 규칙(FUNCTIONS F10): owned===true && my_ingredient_id!=null, ID 기준 중복 제거.
//   양념·가상 보유 밥(my_ingredient_id=null)과 부족 재료(owned=false)는 삭제할 재고가 없으므로 제외한다.

export function getCookCandidates(ingredients) {
  const seen = new Set();
  const result = [];
  for (const item of ingredients ?? []) {
    if (item.owned !== true || item.my_ingredient_id == null) continue;
    if (seen.has(item.my_ingredient_id)) continue;
    seen.add(item.my_ingredient_id);
    result.push({ id: item.my_ingredient_id, name: item.name });
  }
  return result;
}

// POST /api/recipes/:id/cook 요청 본문. 선택 0개여도 빈 배열을 보낸다(요리 기록만 저장).
export function buildCookBody(selectedIds) {
  return { used_ingredient_ids: [...selectedIds].map(Number) };
}
