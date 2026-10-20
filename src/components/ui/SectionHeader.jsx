// SectionHeader — 섹션 제목(h2 기본, level=3이면 h3) + 우측 메타(예: 총 3개) (SectionHeader.md)
import { forwardRef } from 'react';

const SectionHeader = forwardRef(function SectionHeader({ title, level = 2, description, accessory, id }, ref) {
  const Tag = level === 3 ? 'h3' : 'h2';
  return (
    <div className="section-header-wrap">
      <div className="section-header">
        <Tag className="t-section-title" id={id} ref={ref} tabIndex={ref ? -1 : undefined}>
          {title}
        </Tag>
        {accessory && <span className="section-header__accessory">{accessory}</span>}
      </div>
      {description && <p className="section-header__desc t-body-sm text-secondary">{description}</p>}
    </div>
  );
});

export default SectionHeader;
