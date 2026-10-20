// StatusLabel — 레시피 재료 보유 여부: owned → '있어요', 아니면 '부족해요' (색은 보조, 문구 필수)
export default function StatusLabel({ owned }) {
  return <span className={`badge ${owned ? 'badge--ok' : 'badge--urgent'}`}>{owned ? '있어요' : '부족해요'}</span>;
}
