// 개발 목업 데이터 모음 (npm run dev:mock 전용)
// - mocks/mockServer.js(가짜 API)만 이 파일을 가져다 쓴다. 화면 코드(pages/components)는 절대 import하지 않는다.
//   → 화면은 항상 httpClient를 거쳐 '응답'으로만 데이터를 받는다(목업이든 실제 서버든 같은 경로).
export { ONE_TOUCH } from './oneTouch.js';
export { INITIAL_INVENTORY } from './inventory.js';
export { RECIPES } from './recipes.js';
export { MOCK_SEASONINGS, MOCK_STAPLES, SEASONING_LIST } from './seasonings.js';
