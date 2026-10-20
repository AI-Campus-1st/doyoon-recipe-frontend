// TextField — 항상 보이는 라벨 + 텍스트 입력 (TextField.md). 값 검증은 상위 폼 로직 책임.
// - inputProps: 고정 props로 다 못 담는 input 속성(자동완성 combobox의 role·aria-*·onKeyDown·onBlur 등)을 그대로 넘긴다.
import { forwardRef } from 'react';
import FormField from './FormField.jsx';

const TextField = forwardRef(function TextField(
  { id, label, value, onChange, placeholder, required, helperText, error, autoComplete, disabled, className, inputMode, maxLength, inputProps },
  ref,
) {
  return (
    <FormField id={id} label={label} required={required} helperText={helperText} error={error} className={className}>
      {({ describedBy, invalid }) => (
        <input
          ref={ref}
          id={id}
          className="field__input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          inputMode={inputMode}
          maxLength={maxLength}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
      )}
    </FormField>
  );
});

export default TextField;
