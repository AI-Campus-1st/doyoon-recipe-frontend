// 변경(POST/PATCH/DELETE) 요청 훅 — 중복 제출 차단 + pending/error 상태
// - pendingRef로 같은 렌더 안에서 연타해도 두 번째 호출을 막는다(state 업데이트 전이라도 차단).
// - 실패해도 입력값은 건드리지 않는다(입력 보존은 호출한 폼의 state가 그대로 유지).
// - 결과 불명 요청을 자동 재전송하지 않는다(현재 API에 멱등 키가 없음).
import { useCallback, useRef, useState } from 'react';
import { isIgnorableError } from '../api/httpClient.js';

export function useMutation(mutate) {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      if (pendingRef.current) return { ok: false, skipped: true };
      pendingRef.current = true;
      setPending(true);
      setError(null);
      try {
        const data = await mutate(...args);
        return { ok: true, data };
      } catch (err) {
        if (!isIgnorableError(err)) setError(err);
        return { ok: false, error: err };
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [mutate],
  );

  const reset = useCallback(() => setError(null), []);
  return { run, pending, error, reset };
}
