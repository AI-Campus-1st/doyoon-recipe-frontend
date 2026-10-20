// RecipeCard — 추천 목록 텍스트 카드 (docs/design/components/RecipeCard.md)
// - 허용 필드만 표시: title, cook_time_min, urgent_used, missing, substitutes. score·이미지·보유율·난이도는 표시하지 않는다.
// - substitutes(2026-10-20): 레시피 재료를 넓은 이름 재고로 대신하는 경우 '대체: 대파 대신 파' 한 줄. 서버가 이런 레시피를 뒤로 미룬다.
// - 카드 전체가 하나의 링크(/recipes/:id). 카드 안에 다른 버튼/링크를 겹치지 않는다.
// - 라우터 Link를 쓰는 이유: 이동은 시맨틱상 '링크'이기 때문(Button.md 규칙).
import { Link } from 'react-router-dom';
import Icon from '../../../components/ui/Icon.jsx';

export default function RecipeCard({ recipe }) {
  const { id, title, cook_time_min: cookTime, urgent_used: urgentUsed = [], missing = [], substitutes = [] } = recipe;
  return (
    <Link to={`/recipes/${id}`} className="card card--interactive recipe-card">
      <span className="recipe-card__head">
        <span className="recipe-card__title t-card-title">{title}</span>
        <span className="text-muted">
          <Icon name="chevron" />
        </span>
      </span>
      <span className="recipe-card__meta t-body-sm text-secondary">
        <Icon name="clock" />약 {cookTime}분
      </span>
      {urgentUsed.length > 0 && (
        <span className="recipe-card__urgent t-body-sm">임박 재료 사용: {urgentUsed.join(', ')}</span>
      )}
      {substitutes.length > 0 && (
        <span className="recipe-card__substitute t-body-sm">
          대체: {substitutes.map((s) => `${s.name} 대신 ${s.stock_name}`).join(', ')}
        </span>
      )}
      {missing.length === 0 ? (
        <span className="badge badge--ok recipe-card__missing">부족 재료 없음</span>
      ) : (
        <span className="recipe-card__missing-text t-body-sm">부족: {missing.join(', ')}</span>
      )}
    </Link>
  );
}
