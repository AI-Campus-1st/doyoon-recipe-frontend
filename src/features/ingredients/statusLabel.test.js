import { describe, it, expect, vi } from 'vitest';
import { formatStatusLabel, formatUrgentLabel, formatExpiryDate } from './statusLabel.js';

describe('formatStatusLabel — 서버 d_day/status를 그대로 문구로 바꾼다', () => {
  it.each([
    [-2, 'expired', '2일 지남 · 만료'],
    [-1, 'expired', '1일 지남 · 만료'],
    [0, 'urgent', '오늘 만료 · 임박'],
    [1, 'urgent', 'D-1 · 임박'],
    [2, 'urgent', 'D-2 · 임박'],
    [3, 'warning', 'D-3 · 주의'],
    [4, 'warning', 'D-4 · 주의'],
    [5, 'warning', 'D-5 · 주의'],
    [6, 'ok', 'D-6 · 여유'],
    [10, 'ok', 'D-10 · 여유'],
  ])('d_day=%i, status=%s → %s', (dDay, status, expected) => {
    expect(formatStatusLabel(dDay, status)).toBe(expected);
  });

  it('D-0은 만료가 아니라 임박이다', () => {
    expect(formatStatusLabel(0, 'urgent')).not.toMatch(/만료$/);
  });

  it('서버 값이 모순되어도 보정하지 않고 status를 따르며 경고를 남긴다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(formatStatusLabel(8, 'urgent')).toBe('D-8 · 임박');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('formatUrgentLabel — 구조 배너 items(d_day만 있음)', () => {
  it('0은 오늘 만료, 1~2는 D-N', () => {
    expect(formatUrgentLabel(0)).toBe('오늘 만료 · 임박');
    expect(formatUrgentLabel(2)).toBe('D-2 · 임박');
  });
});

describe('formatExpiryDate — 날짜를 재계산하지 않고 표기만 바꾼다', () => {
  it('YYYY-MM-DD → YYYY.MM.DD', () => {
    expect(formatExpiryDate('2026-10-15')).toBe('2026.10.15');
  });
  it('형식이 다르면 원문 그대로', () => {
    expect(formatExpiryDate('unknown')).toBe('unknown');
  });
});
