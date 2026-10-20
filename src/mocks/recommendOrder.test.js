import { describe, it, expect } from 'vitest';
import { compareRecommendations, compareKeyMenus, QUICK_COOK_MAX_MIN, tieBreakKey } from './mockServer.js';

// usesStock 기본 true(내 재고를 쓰는 레시피), tieKey 기본 0
const r = (id, title, cook_time_min, score, missing = [], extra = {}) => ({ id, title, cook_time_min, score, missing, urgent_used: [], usesStock: true, tieKey: 0, ...extra });

describe('추천 정렬 — 재고 사용 → 부족 0개 → 15분 이하 → score → 무작위 → id (2026-10-19)', () => {
  const sort = (list) => [...list].sort(compareRecommendations).map((x) => x.id);

  it('15분 이하 기준값은 15분', () => {
    expect(QUICK_COOK_MAX_MIN).toBe(15);
  });

  it('내 재고를 쓰지 않는 레시피는 부족 0개·고득점이어도 맨 뒤', () => {
    expect(sort([r(1, '간장밥', 5, 1, [], { usesStock: false }), r(2, '두부조림', 25, -1, ['대파'])])).toEqual([2, 1]);
  });

  it('부족 0개 그룹 안에서 15분 이하가 점수와 상관없이 먼저', () => {
    expect(sort([r(1, '감자조림', 25, 9), r(2, '두부조림', 15, 1), r(3, '계란밥', 10, 2)])).toEqual([3, 2, 1]);
  });

  it('15분 이하라도 부족 재료가 있으면 부족 0개 레시피보다 뒤', () => {
    expect(sort([r(1, '양파덮밥', 12, 9, ['양파']), r(2, '된장국', 30, 0)])).toEqual([2, 1]);
  });

  it('부족 재료가 있는 그룹 안에서도 15분 이하가 먼저', () => {
    expect(sort([r(1, '찌개', 30, 5, ['애호박']), r(2, '덮밥', 12, 1, ['양파'])])).toEqual([2, 1]);
  });

  it('15분은 포함, 16분은 일반 그룹', () => {
    expect(sort([r(1, '나', 16, 5), r(2, '가', 15, 1)])).toEqual([2, 1]);
  });

  it('동점은 이름이 아니라 tieKey 순 → id', () => {
    expect(sort([r(1, '가', 10, 2, [], { tieKey: 9 }), r(2, '나', 10, 2, [], { tieKey: 3 }), r(3, '다', 10, 2, [], { tieKey: 3 })])).toEqual([2, 3, 1]);
  });

  it('tieBreakKey는 같은 씨앗이면 같고, 날짜가 바뀌면 순서가 달라진다', () => {
    expect(tieBreakKey('1:2026-10-19', 5)).toBe(tieBreakKey('1:2026-10-19', 5));
    const order = (seed) => [1, 2, 3, 4, 5, 6, 7, 8].sort((a, b) => tieBreakKey(seed, a) - tieBreakKey(seed, b)).join();
    expect(order('1:2026-10-19')).not.toBe(order('1:2026-10-20'));
  });
});

describe('대표 메뉴 영역 순서(목업) — 부족 적은 순 → 시간 짧은 순 → 주재료 적은 순 → 무작위 → id (2026-10-19)', () => {
  const k = (id, cook_time_min, missingCount, mainCount, tieKey = 0) => ({ id, cook_time_min, missing: Array(missingCount).fill('x'), mainCount, tieKey });
  const sort = (list) => [...list].sort(compareKeyMenus).map((x) => x.id);

  it('부족 재료가 적은 것이 시간보다 먼저', () => {
    expect(sort([k(1, 5, 2, 2), k(2, 25, 0, 3)])).toEqual([2, 1]);
  });
  it('부족이 같으면 시간 짧은 순, 그다음 주재료 적은 순', () => {
    expect(sort([k(1, 20, 1, 2), k(2, 10, 1, 4), k(3, 10, 1, 2)])).toEqual([3, 2, 1]);
  });
  it('모두 같으면 tieKey → id', () => {
    expect(sort([k(1, 10, 0, 1, 5), k(2, 10, 0, 1, 1), k(3, 10, 0, 1, 1)])).toEqual([2, 3, 1]);
  });
});
