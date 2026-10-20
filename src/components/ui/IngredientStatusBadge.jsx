// IngredientStatusBadge — 기한 상태를 '숫자 + 문구 + 색'으로 함께 표시 (IngredientStatusBadge.md)
// - 서버 d_day/status를 그대로 사용(재계산 금지). 문구 규칙은 features/ingredients/statusLabel.js.
import { formatStatusLabel } from '../../features/ingredients/statusLabel.js';

export default function IngredientStatusBadge({ dDay, status }) {
  return <span className={`badge badge--${status}`}>{formatStatusLabel(dDay, status)}</span>;
}
