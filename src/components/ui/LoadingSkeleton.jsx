// LoadingSkeleton — 실제 콘텐츠 높이를 비슷하게 확보하는 로딩 자리 (LoadingSkeleton.md)
export default function LoadingSkeleton({ variant = 'row', count = 1, label = '불러오는 중이에요' }) {
  return (
    <div aria-busy="true" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`skeleton skeleton--${variant}`} aria-hidden="true" />
      ))}
    </div>
  );
}
