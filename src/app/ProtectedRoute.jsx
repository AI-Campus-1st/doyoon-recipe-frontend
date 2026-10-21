// 보호 라우트 — 로그인 표시가 없으면 /login으로 보낸다(쿠키 만료·위조는 첫 보호 API의 401에서 처리, 2026-10-21).
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthProvider.jsx';

export default function ProtectedRoute() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
