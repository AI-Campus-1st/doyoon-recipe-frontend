// 브라우저 탭 제목: '화면명 | 간단 레시피 추천기' (각 페이지 문서의 document.title 규칙)
import { useEffect } from 'react';
import { BRAND_NAME } from '../../components/ui/AppHeader.jsx';

export function useDocumentTitle(pageTitle) {
  useEffect(() => {
    document.title = `${pageTitle} | ${BRAND_NAME}`;
  }, [pageTitle]);
}
