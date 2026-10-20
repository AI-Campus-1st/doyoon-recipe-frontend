// AlwaysOwnedNotice — "기본 양념과 밥은 있다고 본다"는 한 줄 안내 + 목록 보기 버튼 (docs/design/components/AlwaysOwnedSheet.md)
// - 순수 UI: 문구와 onOpen만 받는다. 시트 열기·데이터 요청은 상위 페이지가 맡는다.
// - 사용처: RecommendationsPage(목록 위), RecipeDetailPage('필요한 재료' 아래)
import Button from '../../../components/ui/Button.jsx';

export default function AlwaysOwnedNotice({ message, onOpen }) {
  return (
    <p className="always-owned-note t-body-sm text-secondary">
      <span>{message}</span>
      <Button variant="text" className="always-owned-note__btn" onClick={onOpen} aria-label="기본 양념·밥 목록 보기">
        목록 보기
      </Button>
    </p>
  );
}
