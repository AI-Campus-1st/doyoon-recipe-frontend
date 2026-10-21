// 인증 상태 Provider — 로그인 표시·로그인 처리·로그아웃·보호 API 401 처리를 한 곳에서 담당
// - 2026-10-21 사용자 결정: 로그인 토큰은 서버가 HttpOnly 쿠키로 보관한다. 화면은 토큰을 갖지 않고
//   '로그인했다는 표시'(sessionHint.js, 비밀 아님)만 들고 있다. 요청에는 브라우저가 쿠키를 자동으로 붙인다.
// - 연결: httpClient.configureHttpClient로(첫 렌더 중, 자식 페이지의 첫 요청보다 먼저) '401 발생 시 할 일'을 등록한다.
// - 로그아웃(F02): bumpSession()으로 진행 중 응답을 무효화 → 서버에 쿠키 삭제 요청(POST /auth/logout, 결과를 기다리지 않음)
//   → 표시·사용자 상태 초기화 → /login 이동. 페이지 컴포넌트가 언마운트되며 페이지별 개인 상태도 함께 사라진다.
// - 사용처: App.jsx에서 라우터 안쪽을 감싼다. 화면은 useAuth()로 user/completeLogin/logout만 사용한다.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bumpSession, configureHttpClient } from '../api/httpClient.js';
import { logout as requestLogout } from '../../features/auth/authService.js';
import { clearSessionHint, readSessionHint, removeLegacyToken, writeSessionHint } from './sessionHint.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [user, setUser] = useState(() => readSessionHint());

  // 첫 렌더 한 번: 옛 토큰을 지우고(전환 전 로그인 사용자는 다시 로그인), httpClient에 401 처리를 등록한다.
  // 렌더 중에 바로 등록하는 이유: React는 useEffect를 자식 → 부모 순서로 실행해서, 여기서 effect로 등록하면
  //   새로고침 직후 HomePage의 첫 GET이 등록보다 먼저 나갈 수 있다(예전 토큰 방식에서 실제로 있었던 버그).
  const initializedRef = useRef(false);
  if (!initializedRef.current) {
    initializedRef.current = true;
    removeLegacyToken();
    configureHttpClient({
      // 보호 API 401(쿠키 없음·만료·위조): 표시·개인 상태 초기화 후 로그인으로 (httpClient가 이미 bumpSession 호출)
      onUnauthorized: () => {
        clearSessionHint();
        setUser(null);
        navigateRef.current('/login', { replace: true });
      },
    });
  }

  const logout = useCallback(() => {
    bumpSession();
    // 서버 쿠키 삭제는 기다리지 않는다: 실패해도(연결 끊김) 화면은 바로 로그아웃.
    // 남은 쿠키는 다음 로그인 때 덮어쓰이거나 7일 뒤 만료된다(사용자 결정 '쿠키만 삭제').
    requestLogout().catch(() => {});
    clearSessionHint();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // 로그인/가입 성공 시 호출: 서버가 이미 쿠키를 심었으므로 표시만 저장하고 홈으로
  const completeLogin = useCallback(
    (loggedInUser) => {
      bumpSession();
      writeSessionHint(loggedInUser);
      setUser({ id: loggedInUser.id, username: loggedInUser.username });
      navigate('/', { replace: true });
    },
    [navigate],
  );

  const value = useMemo(() => ({ user, completeLogin, logout }), [user, completeLogin, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있어요.');
  return ctx;
}
