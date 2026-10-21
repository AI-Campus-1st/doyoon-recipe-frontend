import { describe, it, expect, beforeEach, vi } from 'vitest';
import { takeKey, clearKey, withIdempotencyKey, IDEMPOTENCY_KEY_TTL_MS } from './idempotencyKeys.js';
import { ApiError } from './httpClient.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// 결과를 모를 때 다시 보낸 요청의 중복 방지(2026-10-21): 같은 요청(slot)에는 같은 키를 다시 쓰고,
// 새로고침해도 이어지도록 sessionStorage에 30분 동안 보관한다. 성공·확실한 실패면 버린다.
describe('idempotencyKeys', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it('같은 slot은 버리기 전까지 같은 키(UUID v4), slot이 다르면 다른 키', () => {
    const a = takeKey('cook:41');
    expect(a).toMatch(UUID);
    expect(takeKey('cook:41')).toBe(a);
    expect(takeKey('cook:42')).not.toBe(a);
    clearKey('cook:41');
    expect(takeKey('cook:41')).not.toBe(a);
  });

  it('sessionStorage에 남아 새로고침 뒤에도 같은 키', () => {
    const a = takeKey('cook:41');
    expect(JSON.stringify(window.sessionStorage)).toContain(a);
    expect(takeKey('cook:41')).toBe(a);
  });

  it('30분이 지난 키는 새로 만든다', () => {
    vi.useFakeTimers({ now: new Date('2026-10-21T00:00:00Z') });
    const a = takeKey('cook:41');
    vi.setSystemTime(new Date(Date.now() + IDEMPOTENCY_KEY_TTL_MS + 1));
    expect(takeKey('cook:41')).not.toBe(a);
    expect(IDEMPOTENCY_KEY_TTL_MS).toBe(30 * 60 * 1000);
  });

  it('sessionStorage를 못 써도(사파리 개인 정보 보호 등) 메모리로 같은 키를 쓴다', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      const a = takeKey('ingredient:두부|');
      expect(takeKey('ingredient:두부|')).toBe(a);
    } finally {
      spy.mockRestore();
      set.mockRestore();
    }
  });

  it('withIdempotencyKey: 성공하면 키를 버린다', async () => {
    const send = vi.fn(async (key) => key);
    const first = await withIdempotencyKey('cook:41', send);
    const second = await withIdempotencyKey('cook:41', send);
    expect(second).not.toBe(first);
  });

  it.each([
    ['연결 실패(0)', new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'x' })],
    ['시간 초과', new ApiError({ status: 0, code: 'TIMEOUT', message: 'x' })],
    ['서버 오류(502)', new ApiError({ status: 502, code: 'SERVER_ERROR', message: 'x' })],
  ])('결과를 모르는 실패(%s)면 키를 남겨 다시 보낼 때 같은 키', async (_label, error) => {
    const keys = [];
    await expect(withIdempotencyKey('cook:41', async (key) => { keys.push(key); throw error; })).rejects.toBe(error);
    await withIdempotencyKey('cook:41', async (key) => { keys.push(key); return null; });
    expect(keys[1]).toBe(keys[0]);
  });

  it.each([
    ['404', new ApiError({ status: 404, code: 'NOT_FOUND', message: 'x' })],
    ['400', new ApiError({ status: 400, code: 'ALWAYS_OWNED', message: 'x' })],
    ['429', new ApiError({ status: 429, code: 'TOO_MANY_REQUESTS', message: 'x' })],
  ])('서버가 처리하지 않았다고 확실한 실패(%s)면 키를 버린다', async (_label, error) => {
    const keys = [];
    await expect(withIdempotencyKey('cook:41', async (key) => { keys.push(key); throw error; })).rejects.toBe(error);
    await withIdempotencyKey('cook:41', async (key) => { keys.push(key); return null; });
    expect(keys[1]).not.toBe(keys[0]);
  });
});
