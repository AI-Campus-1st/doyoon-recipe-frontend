// BottomSheet — 아래에서 올라오는 시트. 공통 동작은 Modal 그대로 (BottomSheet.md)
import Modal from './Modal.jsx';

export default function BottomSheet({ open, title, onClose, children, busy = false, initialFocusRef }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      busy={busy}
      placement="bottom"
      showHandle
      initialFocusRef={initialFocusRef}
    >
      {children}
    </Modal>
  );
}
