import { describe, it, expect } from 'vitest';
import { validateSearchQuery, SEARCH_QUERY_MAX } from './searchQuery.js';

// F13 검색어 검사(순수 함수) — 서버 normalizeSearchQuery와 같은 기준(앞뒤 공백 제거·연속 공백 하나로·1~30자)
describe('validateSearchQuery', () => {
  it('정리된 검색어를 돌려준다', () => {
    expect(validateSearchQuery('  김치   찌개 ')).toEqual({ query: '김치 찌개', error: null });
  });

  it('비었거나 공백뿐이면 입력 안내', () => {
    expect(validateSearchQuery('')).toEqual({ query: null, error: '검색어를 입력해 주세요.' });
    expect(validateSearchQuery('   ')).toEqual({ query: null, error: '검색어를 입력해 주세요.' });
  });

  it(`${SEARCH_QUERY_MAX}자까지 허용, 넘으면 길이 안내(이모지도 1자)`, () => {
    expect(SEARCH_QUERY_MAX).toBe(30);
    expect(validateSearchQuery('가'.repeat(30)).query).toBe('가'.repeat(30));
    expect(validateSearchQuery('🍲'.repeat(30)).query).toBe('🍲'.repeat(30));
    expect(validateSearchQuery('가'.repeat(31))).toEqual({ query: null, error: '검색어는 30자 이하로 입력해 주세요.' });
  });
});
