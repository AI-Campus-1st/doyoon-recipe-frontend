// 인증 상태 Provider — 토큰 보관·로그인 처리·로그아웃·보호 API 401 처리를 한 곳에서 담당
// - 연결: httpClient.configureHttpClient로(첫 렌더 중, 자식 페이지의 첫 요청보다 먼저) '토큰 읽기'와 '401 발생 시 할 일'을 등록한다.
// - 로그아웃(F02): bumpSession()으로 진행 중 응답을 무효화 → 토큰·사용자 상태 초기화 → /login 이동.
//   페이지 컴포넌트가 언마운트되며 페이지별 개인 상태(목록·선택·모달)도 함께 사라진다.
// - 사용처: App.jsx에서 라우터 안쪽을 감싼다. 화면은 useAuth()로 token/login/logout만 사용한다.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bumpSession, configureHttpClient } from '../api/httpClient.js';
import { clearToken, readToken, writeToken } from './tokenStorage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => readToken());
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const logout = useCallback(() => {
    bumpSession();
    clearToken();
    setToken(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // httpClient에 '토큰 읽기'와 '401 처리'를 렌더 중에 바로 등록한다(useEffect가 아님).
  // 왜: React는 useEffect를 자식 → 부모 순서로 실행한다. 예전처럼 여기서 useEffect로 등록하면
  //   새로고침 직후 HomePage의 첫 GET(자식 effect)이 등록보다 먼저 나가 Authorization 헤더 없이 전송되고,
  //   실제 서버가 401을 돌려줘 강제 로그아웃됐다. 개발 모드는 StrictMode가 effect를 두 번 실행해 증상이 가려졌다.
  // 등록하는 함수는 ref만 읽으므로 렌더마다 다시 등록해도 결과가 같다(멱등) — 첫 렌더 한 번만 등록한다.
  const registeredRef = useRef(false);
  if (!registeredRef.current) {
    registeredRef.current = true;
    configureHttpClient({
      getToken: () => tokenRef.current,
      // 보호 API 401: 토큰·개인 상태 초기화 후 로그인으로 (httpClient가 이미 bumpSession 호출)
      onUnauthorized: () => {
        clearToken();
        tokenRef.current = null;
        setToken(null);
        navigateRef.current('/login', { replace: true });
      },
    });
  }

  // 로그인/가입 성공 시 호출: 토큰 저장 후 홈으로
  const completeLogin = useCallback(
    (newToken) => {
      bumpSession();
      writeToken(newToken);
      tokenRef.current = newToken;
      setToken(newToken);
      navigate('/', { replace: true });
    },
    [navigate],
  );

  const value = useMemo(() => ({ token, completeLogin, logout }), [token, completeLogin, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있어요.');
  return ctx;
}
