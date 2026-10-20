// StatusLabel — 레시피 재료 보유 여부: owned → '있어요', 아니면 '부족해요' (색은 보조, 문구 필수)
// - substitute(2026-10-20): 넓은 이름 재고로 대신 채운 재료 → '대체 가능'(주의 색)
export default function StatusLabel({ owned, substitute = false }) {
  if (owned && substitute) return <span className="badge badge--warning">대체 가능</span>;
  return <span className={`badge ${owned ? 'badge--ok' : 'badge--urgent'}`}>{owned ? '있어요' : '부족해요'}</span>;
}
