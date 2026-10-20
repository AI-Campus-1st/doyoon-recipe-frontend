// OneTouchGrid — 원터치 재료 타일 그리드 (docs/design/components/OneTouchGrid.md)
// - 입력: GET /api/one-touch 상태. category 원문·반환 순서로 묶는다(품목/카테고리 하드코딩 금지).
// - 타일 1회 탭 = 즉시 단건 등록(onPick(name)). 다중 선택·장바구니·일괄 등록 없음.
// - pendingName: 요청 중인 타일(로딩 표시), locked: 등록 진행 중이면 전체 그리드 잠금(중복 POST 방지).
import SectionHeader from '../../../components/ui/SectionHeader.jsx';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { groupByCategory } from '../ingredientForm.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

export default function OneTouchGrid({ state, onRetry, onPick, pendingName, locked, error }) {
  return (
    <section aria-labelledby="one-touch-title" className="one-touch">
      <SectionHeader
        id="one-touch-title"
        title="자주 쓰는 재료, 한 번에 등록"
        description="버튼을 누르면 유통기한이 자동 설정돼요."
      />

      {state.status === 'loading' && (
        <div className="one-touch__grid">
          <LoadingSkeleton variant="tile" count={6} />
        </div>
      )}
      {state.status === 'error' && <InlineError message={pickErrorMessage(state.error, { fallback: '빠른 선택을 불러오지 못했어요.' })} onRetry={onRetry} />}
      {state.status === 'success' && state.data.length === 0 && <EmptyState title="등록 가능한 빠른 선택이 없어요" />}

      {state.status === 'success' &&
        groupByCategory(state.data).map((group, index) => (
          <div key={group.category} className="one-touch__group">
            <h3 className="one-touch__category t-body-strong" id={`one-touch-cat-${index}`}>
              {group.category}
            </h3>
            <ul className="one-touch__grid" aria-labelledby={`one-touch-cat-${index}`}>
              {group.items.map((item) => {
                const isPending = pendingName === item.name;
                return (
                  <li key={item.name}>
                    <button
                      type="button"
                      className="one-touch__tile"
                      onClick={() => onPick(item.name)}
                      disabled={locked}
                      aria-busy={isPending || undefined}
                      aria-label={`${item.name} 등록`}
                    >
                      {isPending && <span className="spinner" aria-hidden="true" />}
                      {item.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

      {error && <InlineError message={error} />}
    </section>
  );
}
