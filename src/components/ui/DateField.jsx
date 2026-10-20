// DateField — 네이티브 date 입력. 값은 항상 'YYYY-MM-DD' 또는 '' (DateField.md)
// - 등록 화면에서는 선택(optional), 편집 시트에서는 선택 재고 expiry_date로 초기화된 필수 입력.
import { forwardRef } from 'react';
import FormField from './FormField.jsx';

const DateField = forwardRef(function DateField(
  { id, label, value, onChange, required, optional, helperText, error, disabled, className },
  ref,
) {
  return (
    <FormField
      id={id}
      label={label}
      required={required}
      optional={optional}
      helperText={helperText}
      error={error}
      className={className}
    >
      {({ describedBy, invalid }) => (
        <input
          ref={ref}
          id={id}
          className="field__input"
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
      )}
    </FormField>
  );
});

export default DateField;
