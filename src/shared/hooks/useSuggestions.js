// 추천 검색어(자동완성) 공통 hook — 레시피 검색(F13)·재료 등록 직접 입력(F04)이 함께 쓴다 (2026-10-21)
// - 화면은 '무엇을 불러올지(fetchSuggestions)·무엇을 요청할 만한 입력인지(normalize)·고르면 무엇을 할지(onChoose)'만 정하고,
//   이 hook이 '언제 요청하고, 무엇을 들고 있고, 키보드를 어떻게 처리할지'를 맡는다. 목록 그리기는 components/ui/SuggestionList.jsx.
// - 흐름: 사용자가 글자를 칠 때 update(text) → 200ms 기다림(debounce) → fetchSuggestions(query, signal) → 목록 열기
//   · debounce: '두부조림'을 치는 동안 글자마다 요청하지 않고, 손을 잠깐 멈췄을 때 한 번만 요청한다.
//   · 새 글자가 오면 이전 타이머·요청을 취소(AbortController)하고, 늦게 도착한 옛 응답은 seq 번호로 버린다
//     (예: '두'의 응답이 '두부'의 응답보다 늦게 와도 목록이 '두' 결과로 되돌아가지 않게).
//   · 실패는 조용히: 추천은 '있으면 편한' 보조 기능이라 실패해도 오류 문구 없이 목록만 안 보인다(검색·등록은 그대로 가능).
// - 왜 입력값(useEffect)이 아니라 update 호출로 요청하나: 추천 항목을 골라 입력칸을 채울 때(setValue)는
//   다시 추천을 요청하면 안 된다(닫은 목록이 또 열림). '사용자가 타이핑했을 때'만 요청하려고 onChange에서 직접 부른다.
// - 접근성(WAI-ARIA combobox): inputProps를 입력칸에 펼치면 role="combobox"·aria-expanded·aria-controls·
//   aria-activedescendant가 붙는다. 포커스는 입력칸에 둔 채 '가리키는 항목'만 바뀐다.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const SUGGEST_DEBOUNCE_MS = 200;

/**
 * @param {object} options
 * @param {string} options.listId 목록(listbox) id — 입력칸 aria-controls와 항목 id의 앞부분
 * @param {(query: string, signal: AbortSignal) => Promise<object[]>} options.fetchSuggestions
 * @param {(text: string) => string|null} options.normalize 요청할 검색어(형식이 안 맞으면 null → 요청 안 함)
 * @param {(item: object) => void} options.onChoose 항목을 골랐을 때(클릭·Enter). 목록은 hook이 먼저 닫는다
 */
export function useSuggestions({ listId, fetchSuggestions, normalize, onChoose }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1); // 키보드로 가리킨 항목(-1 = 없음)
  const timerRef = useRef(null);
  const controllerRef = useRef(null);
  const seqRef = useRef(0);
  // 화면이 매번 새 함수를 넘겨도 타이머가 최신 함수를 쓰게 ref에 담는다
  const optionsRef = useRef({ fetchSuggestions, normalize, onChoose });
  useLayoutEffect(() => {
    optionsRef.current = { fetchSuggestions, normalize, onChoose };
  });

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
      const query = optionsRef.current.normalize(text);
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
        optionsRef.current
          .fetchSuggestions(query, controller.signal)
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

  const choose = useCallback(
    (item) => {
      close();
      optionsRef.current.onChoose(item);
    },
    [close],
  );

  const listOpen = open && items.length > 0;

  // 키보드: ↓/↑ 항목 옮기기(끝에서 반대쪽으로 순환), Enter 가리킨 항목 고르기(가리킨 게 없으면 원래 동작 = 폼 제출), Esc 닫기
  function handleKeyDown(event) {
    if (!listOpen) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); // 입력칸 커서가 맨 앞/뒤로 튀지 않게
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((i) => (i < 0 ? (delta > 0 ? 0 : items.length - 1) : (i + delta + items.length) % items.length));
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault(); // 폼 제출을 막고 가리킨 항목을 고른다
      choose(items[activeIndex]);
    }
  }

  const optionId = useCallback((index) => `${listId}-option-${index}`, [listId]);

  // 화면을 떠날 때 남은 타이머·요청 정리(떠난 뒤 setState 방지)
  useEffect(() => cancel, [cancel]);

  return {
    items,
    open: listOpen,
    activeIndex,
    update,
    close,
    choose,
    optionId,
    listId,
    // TextField inputProps로 그대로 넘긴다
    inputProps: {
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': listOpen,
      'aria-controls': listId,
      'aria-activedescendant': listOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined,
      onKeyDown: handleKeyDown,
      onBlur: close, // 다른 곳을 누르면 닫힘(항목 클릭은 SuggestionList의 onMouseDown으로 blur를 막는다)
    },
  };
}
