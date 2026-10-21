// 앱 라우팅 — MVP 6개 화면 + 레시피 검색(F13, 2026-10-19 사용자 결정) (FUNCTIONS §1). 편집 시트·삭제 확인·완료 모달은 route가 아니라 오버레이.
// 구조: BrowserRouter > AuthProvider(토큰/401/로그아웃) > ToastProvider(화면 이동 후에도 안내 유지) > RouteErrorBoundary(화면 오류 → 오류 페이지) > Routes
// - SlowServerNotice: 요청이 5초 넘게 걸리면 '서버를 깨우는 중' 안내(2026-10-21, 배포 서버 잠듦 대응)
// - 없는 주소('*')는 홈으로 몰래 보내지 않고 '접근할 수 없는 페이지예요' 오류 페이지를 보여 준다(2026-10-20 사용자 결정).
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../shared/auth/AuthProvider.jsx';
import { ToastProvider } from '../shared/toast/ToastProvider.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RouteErrorBoundary from './RouteErrorBoundary.jsx';
import ErrorPage from './ErrorPage.jsx';
import SlowServerNotice from './SlowServerNotice.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import SignupPage from '../features/auth/pages/SignupPage.jsx';
import HomePage from '../features/ingredients/pages/HomePage.jsx';
import AddIngredientPage from '../features/ingredients/pages/AddIngredientPage.jsx';
import RecommendationsPage from '../features/recipes/pages/RecommendationsPage.jsx';
import RecipeDetailPage from '../features/recipes/pages/RecipeDetailPage.jsx';
import RecipeSearchPage from '../features/recipes/pages/RecipeSearchPage.jsx';

export function AppRoutes() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouteErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/ingredients/new" element={<AddIngredientPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            {/* 고정 경로 /recipes/search가 /recipes/:id보다 우선한다(react-router는 고정 경로를 먼저 맞춘다) */}
            <Route path="/recipes/search" element={<RecipeSearchPage />} />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          </Route>
          {/* 로그인 여부와 상관없이 안내(홈으로 가기 → 로그아웃 상태면 보호 라우트가 로그인으로 보냄) */}
          <Route path="*" element={<ErrorPage kind="notFound" />} />
        </Routes>
        </RouteErrorBoundary>
        <SlowServerNotice />
      </ToastProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
