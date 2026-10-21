// 요청 중복 방지 키(멱등 키) 보관 — 서버 ERD v4 idempotency_keys, API.md §1.2 (2026-10-21 사용자 결정)
// - 왜: 요리 완료·재료 등록을 보냈는데 응답을 못 받으면(시간 제한 70초·연결 끊김) 서버가 이미 처리했을 수 있다.
//   다시 누를 때 같은 키(Idempotency-Key 헤더)를 보내면 서버는 다시 실행하지 않고 처음 응답을 돌려준다.
// - slot: '같은 요청'을 가리키는 이름. 요리 완료는 `cook:<레시피 id>`, 재료 등록은 `ingredient:<이름>|<날짜>`.
// - 보관: sessionStorage(이 탭에서만, 새로고침해도 유지)에 30분. 못 쓰면(개인 정보 보호 모드 등) 메모리에.
// - 버리는 때: 성공했을 때, 또는 서버가 처리하지 않았다고 확실한 실패(4xx)일 때. 결과를 모르는 실패(연결 실패·
//   시간 초과·5xx)면 남겨서 다음에 같은 키로 보낸다.
import { isIgnorableError } from './httpClient.js';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
export const IDEMPOTENCY_KEY_TTL_MS = 30 * 60 * 1000;
const PREFIX = 'recipe.idem.';
const memory = new Map(); // sessionStorage를 못 쓸 때 대신

function read(slot) {
  let raw;
  try {
    raw = window.sessionStorage.getItem(PREFIX + slot);
  } catch {
    raw = memory.get(slot);
  }
  if (raw == null) raw = memory.get(slot); // 쓰기만 실패했던 경우
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    return Date.now() - saved.at <= IDEMPOTENCY_KEY_TTL_MS ? saved.key : null;
  } catch {
    return null;
  }
}

function write(slot, value) {
  const raw = value === null ? null : JSON.stringify(value);
  try {
    if (raw === null) window.sessionStorage.removeItem(PREFIX + slot);
    else window.sessionStorage.setItem(PREFIX + slot, raw);
    memory.delete(slot);
  } catch {
    if (raw === null) memory.delete(slot);
    else memory.set(slot, raw);
  }
}

/** UUID v4. crypto.randomUUID는 https·localhost에서만 있어서, 없으면 getRandomValues로 만든다 */
function newKey() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** slot의 키(없거나 30분 지났으면 새로 만들어 저장) */
export function takeKey(slot) {
  const existing = read(slot);
  if (existing) return existing;
  const key = newKey();
  write(slot, { key, at: Date.now() });
  return key;
}

export function clearKey(slot) {
  write(slot, null);
}

/** 서버가 처리했는지 모르는 실패인가(그러면 키를 남긴다) */
function outcomeUnknown(error) {
  return isIgnorableError(error) || !(error?.status >= 400 && error?.status < 500);
}

/** send(key)를 보낸다. 성공·확실한 실패면 키를 버리고, 결과를 모르면 남긴다 */
export async function withIdempotencyKey(slot, send) {
  const key = takeKey(slot);
  try {
    const result = await send(key);
    clearKey(slot);
    return result;
  } catch (error) {
    if (!outcomeUnknown(error)) clearKey(slot);
    throw error;
  }
}
