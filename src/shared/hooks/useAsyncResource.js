// 읽기(GET) 요청 상태 훅 — loading / success / error를 영역별로 독립 관리
// - 사용처: HomePage(rescue, ingredients 각각), AddIngredientPage(one-touch), RecommendationsPage, RecipeDetailPage.
// - 오래된 응답 방지: 새로 불러오거나 화면을 떠나면 이전 요청을 AbortController로 취소하고,
//   로그아웃 뒤 도착한 응답(StaleSessionError)은 무시한다.
// - 빈 배열은 성공(success)이다. 실패를 빈 데이터로 바꾸지 않는다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { isIgnorableError } from '../api/httpClient.js';

export function useAsyncResource(loader, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const controllerRef = useRef(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const load = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((prev) => ({ status: 'loading', data: prev.data, error: null }));
    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted || isIgnorableError(error)) return;
        setState({ status: 'error', data: null, error });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  return { ...state, reload: load };
}
