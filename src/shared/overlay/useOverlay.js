// 오버레이(모달·시트) 공통 동작 훅 — docs/design/components/Modal.md '공통 오버레이 동작 계약' 구현
// - 역할: ① 배경(#root와 아래 오버레이)을 inert로 막기 ② 문서 스크롤 잠금 ③ 열릴 때 포커스 진입
//         ④ Tab 포커스 트랩 ⑤ ESC 닫기(busy=false이고 맨 위 오버레이일 때만) ⑥ 닫힐 때 원래 트리거로 포커스 복귀.
// - 사용처: components/ui/Modal.jsx (BottomSheet·ConfirmDialog·CookDoneModal이 모두 Modal을 통해 사용).
// - 왜 스택인가: 편집 시트 위에 삭제 확인을 겹쳐 열 때, 맨 위 확인창만 활성화되고 시트는 비활성(inert)이어야 하기 때문.
import { useEffect, useRef } from 'react';

const stack = []; // 열린 오버레이 표면 DOM 노드들(아래 → 위)

function syncInertAndScroll() {
  const root = document.getElementById('root');
  if (root) root.inert = stack.length > 0;
  stack.forEach((node, index) => {
    const container = node.closest('.overlay');
    if (container) container.inert = index !== stack.length - 1;
  });
  document.body.classList.toggle('is-scroll-locked', stack.length > 0);
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function useOverlay({ open, surfaceRef, busy, onEscape, initialFocusRef }) {
  const busyRef = useRef(busy);
  const onEscapeRef = useRef(onEscape);
  busyRef.current = busy;
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!open) return undefined;
    const surface = surfaceRef.current;
    const previouslyFocused = document.activeElement;
    stack.push(surface);
    syncInertAndScroll();

    const target = initialFocusRef?.current ?? surface.querySelector(FOCUSABLE) ?? surface;
    target.focus();

    function handleKeyDown(event) {
      if (stack[stack.length - 1] !== surface) return; // 맨 위 오버레이만 반응
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!busyRef.current) onEscapeRef.current?.();
        return;
      }
      if (event.key === 'Tab') {
        const items = [...surface.querySelectorAll(FOCUSABLE)];
        if (items.length === 0) {
          event.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = stack.indexOf(surface);
      if (index >= 0) stack.splice(index, 1);
      syncInertAndScroll();
      // 원래 트리거가 아직 화면에 있으면 그곳으로 복귀(사라졌으면 소유 페이지가 직접 포커스를 옮긴다)
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
    // initialFocusRef/surfaceRef는 ref 객체라 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
