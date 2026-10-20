// PasswordField — 마스킹 기본 + 표시/숨김 토글(type=button이라 폼 제출을 일으키지 않음) (PasswordField.md)
import { forwardRef, useState } from 'react';
import FormField from './FormField.jsx';
import IconButton from './IconButton.jsx';

const PasswordField = forwardRef(function PasswordField(
  { id, label, value, onChange, placeholder, required, helperText, error, autoComplete, disabled, className },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField id={id} label={label} required={required} helperText={helperText} error={error} className={className}>
      {({ describedBy, invalid }) => (
        <>
          <input
            ref={ref}
            id={id}
            className="field__input field__input--with-toggle"
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            autoComplete={autoComplete}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          />
          <IconButton
            className="field__toggle"
            icon={visible ? 'eyeOff' : 'eye'}
            ariaLabel={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          />
        </>
      )}
    </FormField>
  );
});

export default PasswordField;
