// API 오류 → 화면 문구 선택 도우미
// - 사용자 결정(2026-10-19): 서버가 준 error.message는 화면에 그대로 쓰지 않는다.
//   서버 문구는 바뀔 수 있고 화면 맥락을 모르기 때문에, 각 화면이 '상황별' 문구를 정해 넘긴다.
// - network: 응답 자체가 없을 때(status 0 — 인터넷 끊김·서버 꺼짐). 기본은 모든 화면 공통 문구(2026-10-20).
// - invalid: 400(입력 형식 오류)일 때 문구. 화면 검증을 통과했는데 서버가 거절한 경우라 "다시 확인해 주세요" 톤.
// - notFound: 404(이미 지워졌거나 없는 항목)일 때 문구. 화면이 다시 시도보다 다른 행동을 안내해야 할 때 쓴다.
// - 429(로그인·가입 시도 횟수 초과, 2026-10-21): 어느 화면이든 공통 문구 TOO_MANY_MESSAGE. 서버 문구는 쓰지 않는다.
// - fallback: 그 밖의 실패(500 등) 문구.
// - 401·409처럼 화면이 따로 처리하는 상태는 호출 전에 걸러 낸다.
export const NETWORK_MESSAGE = '인터넷 연결을 확인하고 다시 시도해 주세요.';
export const TOO_MANY_MESSAGE = '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';

export function pickErrorMessage(error, { invalid, notFound, network = NETWORK_MESSAGE, fallback }) {
  if (error?.status === 0) return network;
  if (error?.status === 429) return TOO_MANY_MESSAGE;
  if (error?.status === 400 && invalid) return invalid;
  if (error?.status === 404 && notFound) return notFound;
  return fallback;
}
