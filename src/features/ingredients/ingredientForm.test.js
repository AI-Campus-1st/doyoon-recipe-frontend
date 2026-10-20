import { describe, it, expect } from 'vitest';
import {
  buildCreateIngredientBody,
  validateCreateForm,
  validateEditDate,
  groupByCategory,
  INGREDIENT_NAME_MAX,
} from './ingredientForm.js';

describe('buildCreateIngredientBody', () => {
  it('날짜가 비면 expiry_date 키 자체를 생략한다', () => {
    const body = buildCreateIngredientBody({ name: '닭다리살', expiryDate: '' });
    expect(body).toEqual({ name: '닭다리살' });
    expect('expiry_date' in body).toBe(false);
  });
  it('날짜가 있으면 YYYY-MM-DD 문자열로 보낸다', () => {
    expect(buildCreateIngredientBody({ name: '두부', expiryDate: '2026-10-20' })).toEqual({
      name: '두부',
      expiry_date: '2026-10-20',
    });
  });
  it('이름 앞뒤 공백은 제거한다', () => {
    expect(buildCreateIngredientBody({ name: '  두부 ', expiryDate: '' })).toEqual({ name: '두부' });
  });
});

describe('validateCreateForm', () => {
  it('이름은 필수', () => {
    expect(validateCreateForm({ name: '  ', expiryDate: '' }).name).toBe('재료명을 입력해 주세요.');
  });
  it('날짜는 선택이며 과거 날짜도 막지 않는다', () => {
    expect(validateCreateForm({ name: '두부', expiryDate: '' })).toEqual({});
    expect(validateCreateForm({ name: '두부', expiryDate: '2020-01-01' })).toEqual({});
  });
  // 사용자 결정(2026-10-19): 재료명은 앞뒤 공백을 뺀 뒤 30자까지(서버도 같은 규칙으로 400)
  it('재료명 최대 길이는 30자', () => {
    expect(INGREDIENT_NAME_MAX).toBe(30);
  });
  it('30자는 통과, 31자는 오류', () => {
    expect(validateCreateForm({ name: '가'.repeat(30), expiryDate: '' })).toEqual({});
    expect(validateCreateForm({ name: '가'.repeat(31), expiryDate: '' }).name).toBe('재료명은 30자 이하로 입력해 주세요.');
  });
  it('앞뒤 공백은 글자 수에 넣지 않는다', () => {
    expect(validateCreateForm({ name: `  ${'가'.repeat(30)}  `, expiryDate: '' })).toEqual({});
  });
  it('이모지처럼 두 칸짜리 문자도 한 글자로 센다', () => {
    expect(validateCreateForm({ name: '🥚'.repeat(30), expiryDate: '' })).toEqual({});
  });
  it('형식이 틀린 날짜는 막는다', () => {
    expect(validateCreateForm({ name: '두부', expiryDate: '2026/10/20' }).expiryDate).toBe(
      '날짜를 YYYY-MM-DD 형식으로 선택해 주세요.',
    );
  });
});

describe('validateEditDate', () => {
  it('변경이 없으면 저장 불가(오류 문구는 없음)', () => {
    expect(validateEditDate('2026-10-15', '2026-10-15')).toEqual({ canSave: false, error: null });
  });
  it('비어 있으면 오류', () => {
    expect(validateEditDate('', '2026-10-15')).toEqual({ canSave: false, error: '유통기한을 선택해 주세요.' });
  });
  it('바뀐 유효 날짜면 저장 가능', () => {
    expect(validateEditDate('2026-10-20', '2026-10-15')).toEqual({ canSave: true, error: null });
  });
});

describe('groupByCategory — API 순서와 category 원문을 유지한다', () => {
  it('처음 등장한 순서대로 그룹을 만들고 품목 순서를 유지', () => {
    const items = [
      { name: '대파', category: '채소', fridge_days: 7 },
      { name: '두부', category: '두부·콩', fridge_days: 5 },
      { name: '양파', category: '채소', fridge_days: 14 },
    ];
    expect(groupByCategory(items)).toEqual([
      { category: '채소', items: [items[0], items[2]] },
      { category: '두부·콩', items: [items[1]] },
    ]);
  });
});
