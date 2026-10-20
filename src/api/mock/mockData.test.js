// 목업 데이터가 API 계약 모양을 지키는지 확인하는 테스트
// - 목업 값을 고치다가 필드를 빠뜨리거나 순서를 깨면 dev:mock 화면이 실제 서버와 달라지므로 미리 막는다.
import { describe, it, expect } from 'vitest';
import { ONE_TOUCH, INITIAL_INVENTORY, RECIPES, MOCK_SEASONINGS, SEASONING_LIST } from './index.js';

describe('개발 목업 데이터', () => {
  it('원터치는 17개(서버 기준 데이터와 같은 이름·순서·기본 기한), 모두 {name, category, fridge_days} 모양', () => {
    expect(ONE_TOUCH).toHaveLength(17);
    expect(ONE_TOUCH.map((o) => o.name)).toEqual(['대파', '양파', '마늘', '애호박', '감자', '당근', '양배추', '표고버섯', '콩나물', '파프리카', '두부', '계란', '우유', '돼지고기', '소고기', '닭가슴살', '햄']);
    expect(ONE_TOUCH.find((o) => o.name === '햄').fridge_days).toBe(10);
    for (const item of ONE_TOUCH) {
      expect(Object.keys(item).sort()).toEqual(['category', 'fridge_days', 'name']);
      expect(Number.isInteger(item.fridge_days)).toBe(true);
    }
  });

  it('예시 재고는 만료·임박·주의·여유를 모두 포함', () => {
    expect(INITIAL_INVENTORY.map((i) => i.offset)).toEqual([-2, 0, 1, 4, 10]);
  });

  it('레시피 id가 겹치지 않고 15분 이하/초과가 모두 있다', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(RECIPES.some((r) => r.cook_time_min <= 15)).toBe(true);
    expect(RECIPES.some((r) => r.cook_time_min > 15)).toBe(true);
  });

  it('양념은 서버 B 규칙과 같은 16개(가나다순), 응답은 양념 뒤에 밥', () => {
    expect(MOCK_SEASONINGS).toHaveLength(16);
    expect([...MOCK_SEASONINGS].sort((a, b) => a.localeCompare(b, 'ko'))).toEqual(MOCK_SEASONINGS);
    expect(SEASONING_LIST.at(-1)).toEqual({ name: '밥', type: 'staple' });
    expect(SEASONING_LIST.filter((s) => s.type === 'seasoning')).toHaveLength(16);
  });
});
