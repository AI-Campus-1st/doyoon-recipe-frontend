// InlineError — 실패한 영역 안의 오류 문구 + (선택) 다시 시도 (InlineError.md)
// role="alert"로 스크린리더에 즉시 알린다. 다른 영역에는 영향을 주지 않는다.
import Button from './Button.jsx';

export default function InlineError({ message, onRetry, retryLabel = '다시 시도', id }) {
  return (
    <div className="inline-error" role="alert" id={id}>
      <span>{message}</span>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
