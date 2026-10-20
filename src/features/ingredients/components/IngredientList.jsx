// IngredientList — 홈 '재고 목록' (docs/design/components/IngredientList.md)
// - 입력: GET /api/ingredients 상태. 서버 순서(expiry_date 오름차순) 그대로, id별 개별 행(같은 이름도 합치지 않음).
// - 행 전체가 버튼: 누르면 onSelect(item) → 상위가 편집 시트를 연다.
// - 긴 재료명은 한 줄 말줄임(…)으로 표시하고, 전체 이름은 행을 눌러 여는 편집 시트 제목에서 보여 준다.
// - focusItemId: 유통기한 저장 뒤 목록을 다시 불러오면(그동안 줄이 잠시 사라져 포커스가 페이지 처음으로 빠짐)
//   새 목록에서 같은 id 줄로 키보드 포커스를 돌려놓는다. 그 재료가 없거나 불러오기에 실패하면 '재고 목록' 제목으로(2026-10-20).
// - 만료 일괄 삭제 버튼은 status==='expired' 항목이 있을 때만 표시(urgent만으로는 표시하지 않음).
import { forwardRef, useEffect, useRef } from 'react';
import SectionHeader from '../../../components/ui/SectionHeader.jsx';
import IngredientStatusBadge from '../../../components/ui/IngredientStatusBadge.jsx';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { formatExpiryDate, formatExpiryDateSpoken, formatStatusLabel } from '../statusLabel.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

export function countExpired(items) {
  return (items ?? []).filter((item) => item.status === 'expired').length;
}

const IngredientList = forwardRef(function IngredientList(
  { state, onRetry, onSelect, onAddIngredient, onBulkDelete, focusItemId = null, onFocusDone },
  headingRef,
) {
  const items = state.status === 'success' ? state.data : [];
  const rowRefs = useRef(new Map()); // id → 줄 버튼 DOM

  useEffect(() => {
    if (focusItemId == null || state.status === 'loading') return;
    const row = state.status === 'success' ? rowRefs.current.get(focusItemId) : null;
    if (row) row.focus();
    else headingRef?.current?.focus();
    onFocusDone?.();
  }, [focusItemId, state.status, state.data, headingRef, onFocusDone]);
  const expiredCount = countExpired(items);

  return (
    <section aria-labelledby="inventory-title" className="inventory">
      <SectionHeader
        ref={headingRef}
        id="inventory-title"
        title="재고 목록"
        accessory={state.status === 'success' ? `총 ${items.length}개` : undefined}
      />

      {state.status === 'loading' && <LoadingSkeleton variant="row" count={3} />}

      {state.status === 'error' && <InlineError message={pickErrorMessage(state.error, { fallback: '냉장고 목록을 불러오지 못했어요.' })} onRetry={onRetry} />}

      {state.status === 'success' && items.length === 0 && (
        <EmptyState
          title="아직 등록한 재료가 없어요"
          description="자주 쓰는 재료부터 추가해 보세요."
          actions={
            <Button variant="secondary" fullWidth onClick={onAddIngredient}>
              재료 추가
            </Button>
          }
        />
      )}

      {state.status === 'success' && items.length > 0 && (
        <>
          <ul className="inventory__list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  ref={(el) => {
                    if (el) rowRefs.current.set(item.id, el);
                    else rowRefs.current.delete(item.id);
                  }}
                  type="button"
                  className="inventory__row"
                  onClick={() => onSelect(item)}
                  aria-label={`${item.name}, ${formatStatusLabel(item.d_day, item.status).replace(' · ', ' ')}, 유통기한 ${formatExpiryDateSpoken(item.expiry_date)}, 수정하기`}
                >
                  {/* 좁은 화면(320px)에서는 배지가 이름·날짜 아래로 내려가고, 화살표는 오른쪽에 고정 */}
                  <span className="inventory__content">
                    <span className="inventory__main">
                      <span className="inventory__name t-body-strong text-ellipsis" title={item.name}>
                        {item.name}
                      </span>
                      <span className="inventory__date t-body-sm text-secondary num">
                        유통기한 {formatExpiryDate(item.expiry_date)}
                      </span>
                    </span>
                    <IngredientStatusBadge dDay={item.d_day} status={item.status} />
                  </span>
                  <span className="inventory__chevron text-muted">
                    <Icon name="chevron" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {expiredCount > 0 && (
            <Button variant="danger-outline" fullWidth className="inventory__bulk" onClick={onBulkDelete}>
              만료 재료 일괄 삭제 ({expiredCount}개)
            </Button>
          )}
          <p className="inventory__note t-caption text-muted">
            기한은 관리용 예상치일 수 있어요. 제품 표시와 보관 상태를 확인해 주세요.
          </p>
        </>
      )}
    </section>
  );
});

export default IngredientList;
