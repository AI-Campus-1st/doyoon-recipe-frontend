// RecipeLinkRow — 구조 배너의 레시피 한 줄 (id/title/cook_time_min만 사용) (RecipeLinkRow.md)
// - 클릭 시 onOpen(id) → 상위(HomePage)가 /recipes/:id로 이동시킨다.
import Icon from './Icon.jsx';

export default function RecipeLinkRow({ id, title, cookTimeMin, onOpen }) {
  return (
    <button type="button" className="recipe-link-row" onClick={() => onOpen(id)}>
      <span className="recipe-link-row__title">{title}</span>
      <span className="recipe-link-row__meta t-body-sm text-secondary">약 {cookTimeMin}분</span>
      <Icon name="chevron" />
    </button>
  );
}
