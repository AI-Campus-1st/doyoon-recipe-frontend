// FormField — 라벨·도움말·오류를 입력과 id로 연결하는 공통 wrapper (FormField.md)
// - 실제 input은 children으로 받는다. TextField/PasswordField/DateField가 이 컴포넌트를 재사용한다.
// - describedBy(도움말/오류 id)는 render-prop으로 input에 넘겨 aria-describedby를 연결한다.
export default function FormField({ id, label, required = false, optional = false, helperText, error, className = '', children }) {
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && <span className="field__required" aria-hidden="true">*</span>}
        {optional && <span className="field__optional">(선택)</span>}
      </label>
      <div className="field__control">{children({ describedBy, invalid: Boolean(error) })}</div>
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
      {helperText && (
        <p id={helperId} className="field__helper">
          {helperText}
        </p>
      )}
    </div>
  );
}
