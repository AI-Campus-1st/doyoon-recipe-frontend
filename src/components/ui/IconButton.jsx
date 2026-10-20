// IconButton — 아이콘만 있는 버튼(뒤로 가기, 닫기). ariaLabel 필수(스크린리더 이름).
import Icon from './Icon.jsx';

export default function IconButton({ icon, ariaLabel, onClick, disabled = false, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      <Icon name={icon} size="lg" />
    </button>
  );
}
