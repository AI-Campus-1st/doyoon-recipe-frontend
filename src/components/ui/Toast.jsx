// Toast — 서버 성공 이후의 짧은 안내 (Toast.md). aria-live로 스크린리더에 전달.
// 실제 상태/타이머는 shared/toast/ToastProvider가 관리하고 여기는 표시만 한다.
export default function Toast({ message, tone = 'success', open }) {
  return (
    <div className="toast-region" aria-live="polite" role="status">
      {open && message && <div className={`toast ${tone === 'error' ? 'toast--error' : ''}`}>{message}</div>}
    </div>
  );
}
