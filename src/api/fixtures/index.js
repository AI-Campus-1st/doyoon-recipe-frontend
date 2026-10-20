// 테스트용 가짜 API 응답 모음 (Vitest 전용)
// - 화면 흐름 테스트(src/test/*.flow.test.jsx)가 mockApi({...})에 넣는 응답 본문을 한곳에 모았다.
// - 값은 테스트가 기대하는 문구·순서와 맞물려 있으므로, 바꾸면 해당 테스트 기대값도 함께 바꿔야 한다.
// - 기준 날짜는 2026-10-15(오늘)로 가정한 값이다(d_day·status는 서버가 계산해 내려 준다고 보고 고정).
// - 운영 코드(pages/components/features)는 이 폴더를 import하지 않는다.
export * from './errors.js';
export * from './auth.js';
export * from './ingredients.js';
export * from './recipes.js';
export * from './seasonings.js';
