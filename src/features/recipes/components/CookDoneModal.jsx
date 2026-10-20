// CookDoneModal — 요리 완료 후 '다 쓴 재료' 선택 모달 (docs/design/components/CookDoneModal.md)
// - 후보: getCookCandidates(상세 ingredients) — owned && my_ingredient_id!=null, ID 중복 제거.
// - 기본 체크 없음, 0개 선택도 확인 가능(요리 기록만 저장). 체크만으로는 아무것도 삭제하지 않는다.
// - 실제 POST는 상위(RecipeDetailPage)의 onConfirm(selectedIds)이 수행. 실패해도 선택은 이 컴포넌트 state에 남는다.
// - busy 동안 확인·닫기·취소·ESC 차단(Modal 공통 계약).
import { useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import { getCookCandidates } from '../cookCandidates.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

export default function CookDoneModal({ open, ingredients, busy, error, onConfirm, onClose }) {
  const candidates = useMemo(() => getCookCandidates(ingredients), [ingredients]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  function toggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev); // 기존 Set을 직접 바꾸지 않고 새 Set을 만든다(React 상태 불변성)
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const count = selectedIds.size;
  return (
    <Modal open={open} title="요리 완료" description="이번에 다 쓴 재료를 체크해 주세요." onClose={onClose} busy={busy}>
      {candidates.length === 0 ? (
        <p className="cook-modal__none t-body-sm">정리할 냉장고 재료가 없어요. 요리 기록은 남길 수 있어요.</p>
      ) : (
        <fieldset className="cook-modal__list" disabled={busy}>
          <legend className="sr-only">다 쓴 재료 선택</legend>
          <p className="t-caption text-muted cook-modal__hint">레시피 재료 전체가 아니라 다 써서 냉장고에서 뺄 재고만 골라 주세요.</p>
          {candidates.map((c) => (
            <label key={c.id} className="check-row" htmlFor={`cook-${c.id}`}>
              <input
                id={`cook-${c.id}`}
                type="checkbox"
                className="check-row__box"
                checked={selectedIds.has(c.id)}
                onChange={() => toggle(c.id)}
              />
              <span className="check-row__label t-body-strong text-ellipsis" title={c.name}>
                {c.name}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <p className="cook-modal__summary t-body-sm" aria-live="polite">
        {count > 0 ? `선택한 재료 ${count}개를 냉장고에서 삭제해요` : '재료를 삭제하지 않고 요리 기록만 남겨요'}
      </p>

      {error && <InlineError message={pickErrorMessage(error, { fallback: '요리 완료를 저장하지 못했어요. 다시 시도해 주세요.' })} />}

      <div className="overlay__actions">
        <Button size="lg" fullWidth loading={busy} loadingText="저장 중..." onClick={() => onConfirm(selectedIds)}>
          요리 완료하고 정리하기
        </Button>
        <Button variant="secondary" fullWidth onClick={onClose} disabled={busy}>
          취소
        </Button>
      </div>
    </Modal>
  );
}
