// Toast 상태 Provider — 화면 이동 후에도 성공 안내가 보이도록 앱 최상단에서 관리
// - 사용처: 페이지에서 const showToast = useToast(); showToast('재료를 삭제했어요') — 반드시 서버 성공 후 호출.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Toast from '../../components/ui/Toast.jsx';

const ToastContext = createContext(() => {});
const DURATION_MS = 2600;

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, tone = 'success') => {
    clearTimeout(timerRef.current);
    setToast({ message, tone, key: Date.now() });
    timerRef.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Toast open={Boolean(toast)} message={toast?.message} tone={toast?.tone} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
