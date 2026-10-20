// CardSurface — 흰 배경 + 연한 테두리 카드. tone으로 urgent/soft/positive 배경 (CardSurface.md)
export default function CardSurface({ tone = 'normal', as: Tag = 'div', className = '', children, ...rest }) {
  const toneClass = tone === 'normal' ? '' : `card--${tone}`;
  return (
    <Tag className={`card ${toneClass} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
