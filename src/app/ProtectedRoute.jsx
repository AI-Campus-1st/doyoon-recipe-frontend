// 보호 라우트 — 토큰이 없으면 /login으로 보낸다(만료/위조 토큰은 첫 보호 API의 401에서 처리).
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthProvider.jsx';

export default function ProtectedRoute() {
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
