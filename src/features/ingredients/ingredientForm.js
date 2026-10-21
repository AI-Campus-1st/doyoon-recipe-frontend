// 재료 등록/수정 폼 규칙 (순수 함수)
// - 역할: 직접 등록 요청 본문 만들기, 등록/편집 입력 검증, 원터치 목록 카테고리 묶기.
// - 사용처: AddIngredientPage.jsx(직접 등록·원터치), IngredientEditSheet.jsx(유통기한 수정)
// - 제약: 날짜 미입력 시 expiry_date 키를 아예 보내지 않는다 → 서버가 기본 기한을 정한다(F04).

const DATE_RULE = /^\d{4}-\d{2}-\d{2}$/;

// 재료명 최대 길이(사용자 결정 2026-10-19). 서버도 같은 규칙으로 400을 돌려준다(FUNCTIONS F04).
// - 앞뒤 공백을 뺀 뒤 센다.
// - [...문자열].length: 이모지처럼 JS 내부에서 두 칸을 차지하는 문자도 한 글자로 센다.
// - 입력칸에 maxLength를 걸지 않는 이유: 긴 글을 붙여 넣으면 브라우저가 말없이 잘라 버려서
//   사용자가 잘린 줄 모르고 저장할 수 있다. 대신 제출 때 오류 문구로 알려 준다.
export const INGREDIENT_NAME_MAX = 30;
const countChars = (text) => [...text].length;

export function buildCreateIngredientBody({ name, expiryDate }) {
  const body = { name: name.trim() };
  if (expiryDate) body.expiry_date = expiryDate;
  return body;
}

// 추천 재료명을 요청할 만한 입력인지(2026-10-21) — 서버 /ingredients/suggest의 q 규칙과 같다.
// NFC(조합형 한글 → 완성형) → 앞뒤 공백 제거 → 연속 공백 하나로 → 1~30자면 그 값, 아니면 null(요청하지 않음)
export function normalizeIngredientQuery(text) {
  const query = String(text ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
  return query && countChars(query) <= INGREDIENT_NAME_MAX ? query : null;
}

export function validateCreateForm({ name, expiryDate }) {
  const errors = {};
  const trimmed = name.trim();
  if (!trimmed) errors.name = '재료명을 입력해 주세요.';
  else if (countChars(trimmed) > INGREDIENT_NAME_MAX) errors.name = `재료명은 ${INGREDIENT_NAME_MAX}자 이하로 입력해 주세요.`;
  // 과거 날짜 금지 규칙은 설계에 없으므로 형식만 검사한다.
  if (expiryDate && !DATE_RULE.test(expiryDate)) errors.expiryDate = '날짜를 YYYY-MM-DD 형식으로 선택해 주세요.';
  return errors;
}

// 편집 시트: 날짜는 필수, 원래 값과 같으면 저장 버튼 비활성
export function validateEditDate(value, original) {
  if (!value) return { canSave: false, error: '유통기한을 선택해 주세요.' };
  if (!DATE_RULE.test(value)) return { canSave: false, error: '날짜를 YYYY-MM-DD 형식으로 선택해 주세요.' };
  return { canSave: value !== original, error: null };
}

// GET /api/one-touch 응답을 category 원문 그대로, 처음 등장한 순서로 묶는다(품목·그룹 하드코딩 금지).
export function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  }
  return [...groups].map(([category, list]) => ({ category, items: list }));
}
