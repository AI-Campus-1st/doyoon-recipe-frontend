// AppHeader — 고정 상단 헤더 + 페이지의 유일한 H1 (AppHeader.md)
// - variant 'home'(S3): 서비스명(일반 텍스트) + 로그아웃 버튼, H1 '내 냉장고'는 헤더 아래 본문 첫 줄.
// - variant 'back'(S2·S4·S5·S6): 뒤로 가기 아이콘 + H1 화면명.
// - 그림자: shadow.HeaderSubtle(사용자 확정), 하단 테두리 없음. 프로필·공유·탭바는 만들지 않는다.
// - 뒤로 가기/로그아웃의 실제 동작(라우팅·토큰 삭제)은 onBack/onLogout으로 상위 페이지가 결정한다.
import IconButton from './IconButton.jsx';
import Button from './Button.jsx';

export const BRAND_NAME = '간단 레시피 추천기';

export default function AppHeader({ title, variant = 'back', onBack, onLogout, titleRef }) {
  if (!title && import.meta.env.DEV) console.warn('[AppHeader] title이 비어 있어요. 화면별 한국어 제목을 넘겨 주세요.');

  if (variant === 'home') {
    return (
      <>
        <header className="app-header">
          <div className="app-header__inner">
            <p className="app-header__brand">{BRAND_NAME}</p>
            <Button variant="text" className="btn--text-muted" onClick={onLogout}>
              로그아웃
            </Button>
          </div>
        </header>
        <h1 className="t-page-title page-heading" ref={titleRef} tabIndex={-1}>
          {title}
        </h1>
      </>
    );
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <IconButton className="app-header__back" icon="back" ariaLabel="뒤로 가기" onClick={onBack} />
        <h1 className="app-header__title t-section-title" ref={titleRef} tabIndex={-1}>
          {title}
        </h1>
      </div>
    </header>
  );
}
