// [개발 목업 데이터] 회원가입 직후 목업 계정에 넣어 주는 예시 재고 — dev:mock 전용.
// - offset = 오늘(Asia/Seoul) 기준 유통기한까지 남은 일수. mockServer가 실제 날짜로 바꿔 저장한다.
// - IMPLEMENTATION.md '상태 화면의 동일 계약' fixture와 같다(우유 -2 만료, 대파 0·두부 1 임박, 계란 4 주의, 양파 10 여유).
export const INITIAL_INVENTORY = [
  { name: '우유', offset: -2 },
  { name: '대파', offset: 0 },
  { name: '두부', offset: 1 },
  { name: '계란', offset: 4 },
  { name: '양파', offset: 10 },
];
