// IngredientEditSheet — 재고 한 건의 유통기한 수정·삭제 하단 시트 (docs/design/components/IngredientEditSheet.md)
// - 입력: 선택한 재고 객체(id 기준). 날짜는 그 재고의 expiry_date로 초기화(필수), 변경 없으면 저장 비활성.
// - 저장/삭제 요청 자체는 상위(HomePage)의 onSave/onDelete가 수행하고, 이 컴포넌트는 폼 상태와 확인 단계만 관리한다.
// - 삭제 확인(ConfirmDialog)은 시트 위에 중첩. 취소하면 확인만 닫히고 포커스는 '재료 삭제' 버튼으로 돌아간다.
// - 요청 중(busy)에는 닫기·ESC·반복 실행을 막고, 실패하면 입력을 유지한 채 오류를 보여준다.
import { useEffect, useRef, useState } from 'react';
import BottomSheet from '../../../components/ui/BottomSheet.jsx';
import DateField from '../../../components/ui/DateField.jsx';
import Button from '../../../components/ui/Button.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import { validateEditDate } from '../ingredientForm.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

export default function IngredientEditSheet({
  ingredient,
  onClose,
  onSave,
  onDelete,
  saving,
  deleting,
  saveError,
  deleteError,
}) {
  const [date, setDate] = useState(ingredient?.expiry_date ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dateRef = useRef(null);

  // 다른 재고를 열면 그 재고의 날짜로 초기화
  useEffect(() => {
    setDate(ingredient?.expiry_date ?? '');
    setConfirmOpen(false);
  }, [ingredient?.id, ingredient?.expiry_date]);

  if (!ingredient) return null;
  const busy = saving || deleting;
  const { canSave, error: dateError } = validateEditDate(date, ingredient.expiry_date);

  return (
    <>
      <BottomSheet open title={ingredient.name} onClose={onClose} busy={busy} initialFocusRef={dateRef}>
        <form
          className="stack-lg"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave && !busy) onSave(ingredient.id, date);
          }}
          noValidate
        >
          <DateField
            ref={dateRef}
            id="edit-expiry"
            label="유통기한"
            required
            value={date}
            onChange={setDate}
            disabled={busy}
            error={dateError ?? undefined}
            helperText="제품 표시와 보관 상태를 확인해 날짜를 맞춰 주세요."
          />
          {saveError && (
            <InlineError
              message={pickErrorMessage(saveError, {
                invalid: '유통기한을 다시 확인해 주세요.',
                fallback: '유통기한을 변경하지 못했어요. 다시 시도해 주세요.',
              })}
            />
          )}
          <div className="overlay__actions">
            <Button type="submit" size="lg" fullWidth disabled={!canSave || deleting} loading={saving} loadingText="저장 중...">
              변경 저장
            </Button>
            <Button variant="danger-text" fullWidth onClick={() => setConfirmOpen(true)} disabled={busy}>
              재료 삭제
            </Button>
          </div>
        </form>
      </BottomSheet>

      <ConfirmDialog
        open={confirmOpen}
        nested
        title="이 재료를 냉장고에서 삭제할까요?"
        description={`${ingredient.name}(유통기한 ${ingredient.expiry_date}) 한 건만 삭제돼요.`}
        confirmLabel="삭제하기"
        destructive
        busy={deleting}
        error={deleteError ? pickErrorMessage(deleteError, { fallback: '재료를 삭제하지 못했어요. 다시 시도해 주세요.' }) : undefined}
        onConfirm={() => onDelete(ingredient.id)}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
