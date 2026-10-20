// ConfirmDialog — 확인/취소 대화상자 (ConfirmDialog.md). 삭제 API는 호출하지 않고 onConfirm만 알린다.
// - 위험 동작이면 확인 버튼을 danger로, 초기 포커스는 '취소'(안전한 컨트롤)에 둔다.
// - error가 있으면 확인창을 유지한 채 오류와 재시도(확인 버튼)를 보여준다.
import { useRef } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import InlineError from './InlineError.jsx';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = '취소',
  destructive = false,
  busy = false,
  error,
  nested = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      busy={busy}
      nested={nested}
      showClose={false}
      role="alertdialog"
      initialFocusRef={cancelRef}
    >
      {error && <InlineError message={error} />}
      <div className="overlay__actions overlay__actions--row">
        <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
