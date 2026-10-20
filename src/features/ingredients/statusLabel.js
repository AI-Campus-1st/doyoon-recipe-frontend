// 재고 기한 상태 문구 만들기 (순수 함수)
// - 역할: 서버가 계산한 d_day/status(Asia/Seoul 기준)를 사람이 읽는 한국어 문구로만 변환한다.
// - 사용처: components/ui/IngredientStatusBadge.jsx(홈 재고 목록), RescueBanner.jsx(구조 배너).
// - 중요한 제약: 브라우저 시간으로 날짜를 다시 계산하지 않는다. 서버 값이 모순돼도 보정하지 않고 경고만 남긴다.

const STATUS_WORD = { urgent: '임박', warning: '주의', ok: '여유', expired: '만료' };

// status별로 d_day가 가져야 하는 범위 — 모순 감지용(표시는 바꾸지 않음)
const EXPECTED_RANGE = {
  expired: (d) => d < 0,
  urgent: (d) => d >= 0 && d <= 2,
  warning: (d) => d >= 3 && d <= 5,
  ok: (d) => d >= 6,
};

export function formatStatusLabel(dDay, status) {
  const word = STATUS_WORD[status];
  if (!word) {
    console.warn('[statusLabel] 알 수 없는 status', status);
    return `D-${dDay}`;
  }
  if (!EXPECTED_RANGE[status](dDay)) {
    console.warn('[statusLabel] 서버 d_day와 status가 맞지 않아요', { dDay, status });
  }
  if (status === 'expired') return `${Math.abs(dDay)}일 지남 · 만료`;
  if (status === 'urgent' && dDay === 0) return '오늘 만료 · 임박';
  return `D-${dDay} · ${word}`;
}

// 구조 배너 items에는 status가 없다(id/name/d_day만). 배너 대상은 서버가 urgent만 보내므로 '임박' 문구로 표시한다.
export function formatUrgentLabel(dDay) {
  return dDay === 0 ? '오늘 만료 · 임박' : `D-${dDay} · 임박`;
}

// '2026-10-15' → '2026.10.15' (표기만 변경, 날짜 계산 없음)
export function formatExpiryDate(isoDate) {
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate ?? '') ? isoDate.replaceAll('-', '.') : isoDate;
}

// 스크린리더용 '2026년 10월 15일'
export function formatExpiryDateSpoken(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? '');
  return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : isoDate;
}
