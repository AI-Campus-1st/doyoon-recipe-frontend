import { describe, it, expect } from 'vitest';
import { getCookCandidates, buildCookBody } from './cookCandidates.js';

const ingredients = [
  { name: '두부', amount: '1모', is_seasoning: false, owned: true, my_ingredient_id: 3 },
  { name: '대파', amount: '1/2대', is_seasoning: false, owned: false, my_ingredient_id: null },
  { name: '간장', amount: '2큰술', is_seasoning: true, owned: true, my_ingredient_id: null },
  { name: '밥', amount: '1공기', is_seasoning: false, owned: true, my_ingredient_id: null },
  { name: '파', amount: '약간', is_seasoning: false, owned: true, my_ingredient_id: 7 },
  { name: '대파(고명)', amount: '약간', is_seasoning: false, owned: true, my_ingredient_id: 7 },
];

describe('getCookCandidates', () => {
  it('owned===true && my_ingredient_id!=null 만 남기고 ID 중복을 제거한다', () => {
    expect(getCookCandidates(ingredients)).toEqual([
      { id: 3, name: '두부' },
      { id: 7, name: '파' },
    ]);
  });
  it('양념·가상 밥·부족 재료는 제외', () => {
    const names = getCookCandidates(ingredients).map((c) => c.name);
    expect(names).not.toContain('간장');
    expect(names).not.toContain('밥');
    expect(names).not.toContain('대파');
  });
  it('입력이 없으면 빈 배열', () => {
    expect(getCookCandidates(undefined)).toEqual([]);
  });
});

describe('buildCookBody', () => {
  it('0개 선택도 빈 배열로 보낸다', () => {
    expect(buildCookBody(new Set())).toEqual({ used_ingredient_ids: [] });
  });
  it('선택 ID를 정수 배열로 보낸다', () => {
    expect(buildCookBody(new Set([3, 7]))).toEqual({ used_ingredient_ids: [3, 7] });
  });
});
