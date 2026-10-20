// Button — 모든 화면 CTA의 공통 버튼 (docs/design/components/Button.md)
// - 순수 UI: API·라우터·스토리지를 모른다. 클릭 결과는 onClick으로 상위(페이지)에 전달한다.
// - loading이면 실제 disabled + aria-busy로 중복 제출을 막는다(disabled || loading).
// - 기본값: variant='primary', size='md', type='button'. 폼 제출 버튼만 type='submit'.
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingText,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = ['btn', `btn--${variant}`, size === 'lg' && 'btn--lg', fullWidth && 'btn--full', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
