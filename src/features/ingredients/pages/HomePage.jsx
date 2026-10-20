// S3 홈 / 내 냉장고 (/) — docs/design/pages/Home.md
// 화면 흐름(페이지가 '컨트롤러' 역할):
//   진입 → fetchRescue, fetchIngredients 를 각각 독립 요청(useAsyncResource 2개, 한쪽 실패가 다른 쪽에 번지지 않음)
//   행 탭 → selected 상태 → IngredientEditSheet → PATCH/DELETE → 성공 시 시트 닫기 + 토스트 + 두 GET 재조회
//   만료 일괄 삭제 → ConfirmDialog → DELETE /ingredients/expired → deleted 개수로 토스트 + 두 GET 재조회
// - 낙관적 업데이트(요청 전에 화면에서 먼저 지우기)를 하지 않는다. 서버 성공 확인 후에만 갱신한다.
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../components/ui/PageContainer.jsx';
import AppHeader from '../../../components/ui/AppHeader.jsx';
import Button from '../../../components/ui/Button.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import RescueBanner from '../components/RescueBanner.jsx';
import IngredientList, { countExpired } from '../components/IngredientList.jsx';
import IngredientEditSheet from '../components/IngredientEditSheet.jsx';
import { useAuth } from '../../../shared/auth/AuthProvider.jsx';
import { useToast } from '../../../shared/toast/ToastProvider.jsx';
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource.js';
import { useMutation } from '../../../shared/hooks/useMutation.js';
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle.js';
import {
  deleteExpiredIngredients,
  deleteIngredient,
  fetchIngredients,
  fetchRescue,
  updateIngredientExpiry,
} from '../ingredientService.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

export default function HomePage() {
  useDocumentTitle('내 냉장고');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const showToast = useToast();

  const rescue = useAsyncResource(fetchRescue);
  const ingredients = useAsyncResource(fetchIngredients);

  const [selected, setSelected] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  // 유통기한 저장 뒤 재조회가 끝나면 키보드 포커스를 돌려놓을 재고 id(IngredientList가 처리 후 비움)
  const [focusItemId, setFocusItemId] = useState(null);
  const clearFocusItem = useCallback(() => setFocusItemId(null), []);
  const inventoryHeadingRef = useRef(null);

  const save = useMutation(updateIngredientExpiry);
  const remove = useMutation(deleteIngredient);
  const bulk = useMutation(deleteExpiredIngredients);

  const refreshAll = useCallback(() => {
    rescue.reload();
    ingredients.reload();
  }, [rescue, ingredients]);

  // 삭제된 행은 포커스 복귀 대상이 될 수 없으므로 재고 목록 제목으로 이동(Modal.md)
  const focusInventoryHeading = () => requestAnimationFrame(() => inventoryHeadingRef.current?.focus());

  function openSheet(item) {
    save.reset();
    remove.reset();
    setSelected(item);
  }

  // 404 = 이 재료가 그새 다른 곳에서 지워짐. 다시 시도해도 같은 결과라 시트를 닫고 목록을 새로 보여 준다.
  function handleGone(mutation) {
    mutation.reset();
    setSelected(null);
    showToast('이미 삭제된 재료예요');
    refreshAll();
    focusInventoryHeading();
  }

  async function handleSave(id, expiryDate) {
    const result = await save.run(id, expiryDate);
    if (!result.ok) {
      if (result.error?.status === 404) handleGone(save);
      return;
    }
    setSelected(null);
    showToast('유통기한을 변경했어요');
    setFocusItemId(id); // 목록을 다시 그리는 동안 줄이 사라져 포커스가 빠지므로, 새 목록에서 같은 재료 줄로 복귀
    refreshAll();
  }

  async function handleDelete(id) {
    const result = await remove.run(id);
    if (!result.ok) {
      if (result.error?.status === 404) handleGone(remove); // 지우려던 재료가 이미 없음 = 원하던 결과
      return;
    }
    setSelected(null);
    showToast('재료를 삭제했어요');
    refreshAll();
    focusInventoryHeading();
  }

  async function handleBulkDelete() {
    const result = await bulk.run();
    if (!result.ok) return;
    setBulkOpen(false);
    showToast(`만료 재료 ${result.data.deleted}개를 삭제했어요`);
    refreshAll();
    focusInventoryHeading();
  }

  const goAdd = () => navigate('/ingredients/new');
  const expiredCount = ingredients.status === 'success' ? countExpired(ingredients.data) : 0;

  return (
    <PageContainer variant="app">
      <AppHeader variant="home" title="내 냉장고" onLogout={logout} />

      <div className="home-sections">
        <RescueBanner
          state={rescue}
          onRetry={rescue.reload}
          onOpenRecipe={(id) => navigate(`/recipes/${id}`)}
          onAddIngredient={goAdd}
          onRefreshRecipes={rescue.reload} // 구조 배너만 다시 부름(재고 목록은 그대로) — 서버가 새 레시피를 고른다
        />

        <IngredientList
          ref={inventoryHeadingRef}
          state={ingredients}
          onRetry={ingredients.reload}
          onSelect={openSheet}
          focusItemId={focusItemId}
          onFocusDone={clearFocusItem}
          onAddIngredient={goAdd}
          onBulkDelete={() => {
            bulk.reset();
            setBulkOpen(true);
          }}
        />

        <div className="home-cta">
          <Button variant="secondary" size="lg" fullWidth onClick={goAdd}>
            + 재료 추가
          </Button>
          <Button size="lg" fullWidth onClick={() => navigate('/recommendations')}>
            오늘 뭐 먹지?
          </Button>
          {/* 원하는 요리가 따로 있을 때(F13): 추천과 별개로 요리명·재료명으로 직접 찾기 */}
          <Button variant="text" fullWidth onClick={() => navigate('/recipes/search')}>
            레시피 검색
          </Button>
        </div>
      </div>

      <IngredientEditSheet
        ingredient={selected}
        onClose={() => setSelected(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={save.pending}
        deleting={remove.pending}
        saveError={save.error}
        deleteError={remove.error}
      />

      <ConfirmDialog
        open={bulkOpen}
        title="만료된 재료를 삭제할까요?"
        description={`냉장고에서 만료된 ${expiredCount}개 재료를 삭제합니다.`}
        confirmLabel="삭제하기"
        destructive
        busy={bulk.pending}
        error={bulk.error ? pickErrorMessage(bulk.error, { fallback: '만료 재료를 삭제하지 못했어요. 다시 시도해 주세요.' }) : undefined}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkOpen(false)}
      />
    </PageContainer>
  );
}
