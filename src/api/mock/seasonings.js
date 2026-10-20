// [개발 목업 데이터] GET /api/seasonings 응답 — dev:mock 전용.
// - 서버 규칙(B 규칙): data/ingredient_master.csv에서 category가 '양념'인 16개 + 가상 기본 재료 '밥'.
// - 서버가 바뀌면 이 사본도 함께 맞춘다(서버 src/domain/alwaysOwned.js, data/ingredient_master.csv 기준).
export const MOCK_SEASONINGS = [
  '간장', '고추장', '고춧가루', '굴소스', '깨', '깨소금', '된장', '물',
  '설탕', '소금', '식용유', '식초', '올리브유', '참기름', '케첩', '후추',
];
export const MOCK_STAPLES = ['밥'];

// API 응답 모양: 양념(가나다순) 뒤에 기본 재료
export const SEASONING_LIST = [
  ...MOCK_SEASONINGS.map((name) => ({ name, type: 'seasoning' })),
  ...MOCK_STAPLES.map((name) => ({ name, type: 'staple' })),
];
