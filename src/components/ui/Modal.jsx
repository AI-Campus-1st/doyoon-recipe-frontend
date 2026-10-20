// Modal — 다이얼로그 표면·딤·포커스·ESC의 공통 기반 (Modal.md)
// - placement 'center'(확인창·완료 모달) | 'bottom'(하단 시트). nested=true면 시트 위 확인창 계층(layer.NestedDialog).
// - 배경 딤 클릭으로는 닫히지 않는다(사용자 결정). busy=true면 닫기 버튼·ESC가 막힌다.
// - API를 직접 호출하지 않는다. 확인/취소의 의미는 children(상위 컴포넌트)이 정한다.
import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../../shared/overlay/useOverlay.js';
import IconButton from './IconButton.jsx';

export default function Modal({
  open,
  title,
  description,
  children,
  onClose,
  busy = false,
  placement = 'center',
  nested = false,
  showClose = true,
  showHandle = false,
  initialFocusRef,
  role = 'dialog',
}) {
  const surfaceRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  useOverlay({ open, surfaceRef, busy, onEscape: onClose, initialFocusRef });

  if (!open) return null;
  return createPortal(
    <div className={`overlay overlay--${placement} ${nested ? 'overlay--nested' : ''}`}>
      {/* 딤: 클릭해도 아무 동작 없음 */}
      <div className="overlay__scrim" aria-hidden="true" />
      <div
        ref={surfaceRef}
        className="overlay__surface"
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        aria-busy={busy || undefined}
        tabIndex={-1}
      >
        {showHandle && <div className="overlay__handle" aria-hidden="true" />}
        <div className="overlay__head">
          <h2 id={titleId} className="overlay__title t-card-title">
            {title}
          </h2>
          {showClose && <IconButton icon="close" ariaLabel="닫기" onClick={onClose} disabled={busy} />}
        </div>
        {description && (
          <p id={descId} className="overlay__desc t-body-sm">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
