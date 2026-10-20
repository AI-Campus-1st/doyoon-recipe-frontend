// '항상 있다고 보는 재료'(기본 양념 + 밥) API 서비스
// - GET /api/seasonings → 200 [{ name, type: 'seasoning' | 'staple' }] (로그인 필요, FUNCTIONS F12)
// - 호출자: components/AlwaysOwnedSheetContainer.jsx (시트를 열 때만 요청)
// - 배열이 아니면 성공 데이터로 취급하지 않고 INVALID_RESPONSE 오류로 바꾼다(빈 목록과 고장 난 응답을 구분).
import { ApiError, request } from '../../shared/api/httpClient.js';

export function assertSeasoningList(data) {
  if (!Array.isArray(data)) {
    throw new ApiError({ status: 200, code: 'INVALID_RESPONSE', message: '응답을 해석하지 못했어요.' });
  }
  return data;
}

export const fetchSeasonings = (signal) => request('/seasonings', { signal }).then(assertSeasoningList);
