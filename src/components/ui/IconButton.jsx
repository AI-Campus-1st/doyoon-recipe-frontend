// IconButton — 아이콘만 있는 버튼(뒤로 가기, 닫기, 새로고침). ariaLabel 필수(스크린리더 이름).
// - size 'sm'(2026-10-20): 아이콘을 작게 그린다. 누르는 영역은 그대로 size.TouchTarget(손가락으로 누르기 쉽게).
import Icon from './Icon.jsx';

export default function IconButton({ icon, ariaLabel, onClick, disabled = false, className = '', size = 'md', ...rest }) {
  return (
    <button
      type="button"
      className={`icon-btn ${size === 'sm' ? 'icon-btn--sm' : ''} ${className}`}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? undefined : 'lg'} />
    </button>
  );
}
