// EmptyState — 정상적인 '0개' 상태 (오류와 다른 문구/컴포넌트) (EmptyState.md)
// action은 { label, onClick } 또는 직접 렌더한 노드 배열(링크 등)을 받는다.
export default function EmptyState({ title, description, actions }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {description && <p className="empty__desc t-body-sm text-secondary">{description}</p>}
      {actions && <div className="empty__actions">{actions}</div>}
    </div>
  );
}
