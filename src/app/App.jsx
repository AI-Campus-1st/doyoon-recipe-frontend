// 앱 라우팅 — MVP 6개 화면 + 레시피 검색(F13, 2026-10-19 사용자 결정) (FUNCTIONS §1). 편집 시트·삭제 확인·완료 모달은 route가 아니라 오버레이.
// 구조: BrowserRouter > AuthProvider(토큰/401/로그아웃) > ToastProvider(화면 이동 후에도 안내 유지) > Routes
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../shared/auth/AuthProvider.jsx';
import { ToastProvider } from '../shared/toast/ToastProvider.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
