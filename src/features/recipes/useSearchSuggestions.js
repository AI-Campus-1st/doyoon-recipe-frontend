// 검색어 자동완성 상태 hook — F13 보강(2026-10-20 사용자 결정), docs/design/pages/RecipeSearch.md
// - 사용처: RecipeSearchPage.jsx. 화면은 '무엇을 그릴지'만, 이 hook은 '언제 요청하고 무엇을 들고 있을지'를 맡는다.
// - 흐름: 사용자가 글자를 칠 때 update(text) → 200ms 기다림(debounce) → GET /recipes/suggest?q= → 목록 열기
//   · debounce: '두부조림'을 치는 동안 글자마다 요청하지 않고, 손을 잠깐 멈췄을 때 한 번만 요청한다.
//   · 새 글자가 오면 이전 타이머·요청을 취소(AbortController)하고, 늦게 도착한 옛 응답은 seq 번호로 버린다
//     (예: '두'의 응답이 '두부'의 응답보다 늦게 와도 목록이 '두' 결과로 되돌아가지 않게).
//   · 실패는 조용히: 추천은 '있으면 편한' 보조 기능이라 실패해도 오류 문구 없이 목록만 안 보인다(검색은 그대로 가능).
// - 왜 입력값(useEffect)이 아니라 update 호출로 요청하나: 추천 항목을 골라 입력칸을 채울 때(setInput)는
//   다시 추천을 요청하면 안 된다(닫은 목록이 또 열림). '사용자가 타이핑했을 때'만 요청하려고 onChange에서 직접 부른다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSearchSuggestions } from './recipeService.js';
import { validateSearchQuery } from './searchQuery.js';

export const SUGGEST_DEBOUNCE_MS = 200;

export function useSearchSuggestions() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1); // 키보드로 가리킨 항목(-1 = 없음)
  const timerRef = useRef(null);
  const controllerRef = useRef(null);
  const seqRef = useRef(0);

  // 기다리는 타이머·보낸 요청을 모두 무효로 만든다(seq를 올리면 이미 온 응답도 무시됨)
  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    controllerRef.current?.abort();
    controllerRef.current = null;
    seqRef.current += 1;
  }, []);

  const close = useCallback(() => {
    cancel();
    setOpen(false);
    setActiveIndex(-1);
  }, [cancel]);

  const update = useCallback(
    (text) => {
      cancel();
      // 검색과 같은 기준으로 거른다: 빈칸·31자 이상이면 요청하지 않고 목록을 닫는다(서버 400을 미리 막음)
      const { query } = validateSearchQuery(text);
      if (!query) {
        setItems([]);
        setOpen(false);
        setActiveIndex(-1);
        return;
      }
      const seq = seqRef.current;
      timerRef.current = setTimeout(() => {
        const controller = new AbortController();
        controllerRef.current = controller;
        fetchSearchSuggestions(query, controller.signal)
          .then((list) => {
            if (seq !== seqRef.current) return; // 그사이 새 입력이 왔으면 버림
            setItems(list);
            setActiveIndex(-1);
            setOpen(list.length > 0);
          })
          .catch(() => {
            if (seq !== seqRef.current) return;
            setItems([]);
            setOpen(false);
          });
      }, SUGGEST_DEBOUNCE_MS);
    },
    [cancel],
  );

  // 위(-1)·아래(+1)로 옮기기. 끝에서 더 가면 반대쪽 끝으로 돈다(목록이 짧아 순환이 편함).
  const move = useCallback(
    (delta) => {
      if (items.length === 0) return;
      setActiveIndex((i) => {
        if (i < 0) return delta > 0 ? 0 : items.length - 1;
        return (i + delta + items.length) % items.length;
      });
    },
    [items.length],
  );

  // 화면을 떠날 때 남은 타이머·요청 정리(떠난 뒤 setState 방지)
  useEffect(() => cancel, [cancel]);

  return { items, open, activeIndex, update, close, move };
}
