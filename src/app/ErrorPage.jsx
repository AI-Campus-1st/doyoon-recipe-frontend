// 오류 페이지(컨트롤러) — 2026-10-20 사용자 결정: 잘못된 주소·화면 오류·없는 레시피에서 전체 화면으로 안내
// - 쓰는 곳: App.jsx의 '*' 라우트(kind 'notFound'), RouteErrorBoundary(kind 'crash'), RecipeDetailPage(kind 'recipeNotFound')
// - 버튼: '홈으로 가기'(주 버튼) + '이전 화면으로'(돌아갈 기록이 있을 때만) + 화면 오류일 때 '다시 시도'
//   - 홈으로 가기는 replace: 뒤로 가기를 눌러 이 오류 화면으로 다시 오지 않게 한다.
//   - 이전 화면으로: location.key가 'default'면 앱 안에서 이동한 기록이 없음(주소를 직접 연 경우) → 버튼 숨김.
//   - 로그아웃 상태라면 홈('/')이 보호 라우트라 자동으로 로그인 화면으로 간다.
// - 서버 500 같은 불러오기 실패는 여기로 오지 않는다(그 영역에만 '다시 시도', 다른 영역·입력값 유지 — FUNCTIONS §1).
import { useLocation, useNavigate } from 'react-router-dom';
import ErrorScreen from '../components/ui/ErrorScreen.jsx';
import Button from '../components/ui/Button.jsx';
import { useDocumentTitle } from '../shared/hooks/useDocumentTitle.js';

const COPY = {
  notFound: { title: '접근할 수 없는 페이지예요', description: '주소가 잘못되었거나 없어진 페이지예요.' },
  recipeNotFound: { title: '레시피를 찾을 수 없어요', description: '주소가 잘못되었거나 더 이상 제공하지 않는 레시피예요.' },
  crash: { title: '화면을 보여 줄 수 없어요', description: '일시적인 문제일 수 있어요. 다시 시도하거나 홈으로 이동해 주세요.' },
};

export default function ErrorPage({ kind = 'notFound', onRetry }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { title, description } = COPY[kind] ?? COPY.notFound;
  useDocumentTitle(title);
  const canGoBack = location.key !== 'default';

  return (
    <ErrorScreen
      title={title}
      description={description}
      actions={
        <>
          {onRetry && (
            <Button size="lg" fullWidth onClick={onRetry}>
              다시 시도
            </Button>
          )}
          <Button size="lg" variant={onRetry ? 'secondary' : 'primary'} fullWidth onClick={() => navigate('/', { replace: true })}>
            홈으로 가기
          </Button>
          {canGoBack && (
            <Button variant="text" fullWidth onClick={() => navigate(-1)}>
              이전 화면으로
            </Button>
          )}
        </>
      }
    />
  );
}
