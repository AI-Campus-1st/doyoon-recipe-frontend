// ErrorScreen — 화면 전체를 쓰는 오류 안내 (docs/design/components/ErrorScreen.md)
// - 순수 UI: 라우터·API를 모른다. 제목·설명·버튼(actions)은 상위(app/ErrorPage.jsx)가 정해 넘긴다.
// - 제목은 이 화면의 유일한 H1. 처음 보일 때 제목에 포커스를 줘서 화면 낭독기가 '무슨 일인지'를 바로 읽게 한다
//   (tabIndex -1 = 마우스·Tab으로는 안 가고 코드로만 포커스 가능).
import { useEffect, useRef } from 'react';
import PageContainer from './PageContainer.jsx';
import Icon from './Icon.jsx';

export default function ErrorScreen({ title, description, actions }) {
  const titleRef = useRef(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, [title]);

  return (
    <PageContainer variant="auth" className="error-screen">
      <div className="error-screen__icon" aria-hidden="true">
        <Icon name="alert" />
      </div>
      <h1 className="error-screen__title t-page-title" ref={titleRef} tabIndex={-1}>
        {title}
      </h1>
      {description && <p className="error-screen__desc text-secondary">{description}</p>}
      {actions && <div className="error-screen__actions">{actions}</div>}
    </PageContainer>
  );
}
