// S6 레시피 상세 (/recipes/:id) — docs/design/pages/RecipeDetail.md
// 흐름: 진입 → fetchRecipe(id) → 제목·시간·분량·재료(있어요/부족해요)·조리 단계(원문 순서) 표시
//       '요리 완료' → CookDoneModal → cookRecipe(id, 선택 ID) → 성공: 토스트 + '/' (홈이 두 GET 재조회) / 실패: 모달·선택 유지
// - 완성 사진: RecipeImage가 image_url 유무·로딩·실패를 처리한다(없거나 실패하면 영역 생략, 제목 위에 표시).
// - 양념·밥은 등록하지 않아도 '있어요'로 표시된다는 안내 + 목록 보기 시트('필요한 재료' 아래)
// - H1은 고정 '레시피 상세', 음식명은 H2. 하단 고정 CTA가 마지막 단계를 가리지 않도록 페이지 하단 여백 확보.
import { useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import PageContainer from '../../../components/ui/PageContainer.jsx';
import AppHeader from '../../../components/ui/AppHeader.jsx';
import SectionHeader from '../../../components/ui/SectionHeader.jsx';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import StatusLabel from '../../../components/ui/StatusLabel.jsx';
import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import CookDoneModal from '../components/CookDoneModal.jsx';
import RecipeImage from '../components/RecipeImage.jsx';
import AlwaysOwnedNotice from '../components/AlwaysOwnedNotice.jsx';
import AlwaysOwnedSheetContainer from '../components/AlwaysOwnedSheetContainer.jsx';
import { useToast } from '../../../shared/toast/ToastProvider.jsx';
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource.js';
import { useMutation } from '../../../shared/hooks/useMutation.js';
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle.js';
import { cookRecipe, fetchRecipe } from '../recipeService.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

export default function RecipeDetailPage() {
  useDocumentTitle('레시피 상세');
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();
  const detail = useAsyncResource((signal) => fetchRecipe(id, signal), [id]);
  const cook = useMutation(cookRecipe);
  const [modalOpen, setModalOpen] = useState(false);
  const [basicsOpen, setBasicsOpen] = useState(false);

  // 앱 안에서 들어왔으면 이전 화면(추천 목록 또는 홈 배너)으로, URL 직접 진입이면 추천 목록으로
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/recommendations'));

  async function handleConfirm(selectedIds) {
    const result = await cook.run(id, selectedIds);
    if (!result.ok) {
      // 404 = 고른 재료가 그새 다른 곳(다른 탭·홈)에서 지워짐 → 다시 시도해도 같은 결과이므로
      // 모달을 닫고 상세를 새로 불러와 지금 남아 있는 재고로 다시 고르게 한다.
      if (result.error?.status === 404) {
        setModalOpen(false);
        cook.reset();
        showToast('이미 냉장고에서 빠진 재료가 있어요. 다시 골라 주세요.');
        detail.reload();
      }
      return;
    }
    setModalOpen(false);
    showToast('요리가 기록됐어요');
    navigate('/');
  }

  const recipe = detail.status === 'success' ? detail.data : null;
  // 404(없는 레시피)와 400(/recipes/abc처럼 숫자가 아닌 주소)은 다시 시도해도 결과가 같다 → '찾을 수 없음' 화면
  const notFound = detail.status === 'error' && [400, 404].includes(detail.error?.status);

  return (
    <PageContainer variant="app" className={recipe ? 'page--with-fixed-cta' : ''}>
      <AppHeader title="레시피 상세" onBack={goBack} />

      {detail.status === 'loading' && (
        <div>
          <LoadingSkeleton variant="banner" />
          <div className="detail-gap" />
          <LoadingSkeleton variant="line" count={4} />
        </div>
      )}

      {notFound && (
        <EmptyState
          title="레시피를 찾을 수 없어요"
          actions={
            <Link className="btn btn--secondary btn--full" to="/recommendations">
              추천 목록으로
            </Link>
          }
        />
      )}
      {detail.status === 'error' && !notFound && (
        <InlineError message={pickErrorMessage(detail.error, { fallback: '레시피를 불러오지 못했어요.' })} onRetry={detail.reload} />
      )}

      {recipe && (
        <article className="detail">
          <RecipeImage src={recipe.image_url} title={recipe.title} />
          <h2 className="detail__title">{recipe.title}</h2>
          <p className="detail__meta t-body-sm text-secondary">
            <Icon name="clock" />
            약 {recipe.cook_time_min}분{recipe.servings ? ` · ${recipe.servings}` : ''}
          </p>

          <section aria-labelledby="detail-ingredients" className="detail__section">
            <SectionHeader id="detail-ingredients" title="필요한 재료" level={3} />
            <ul className="card detail__ingredients">
              {recipe.ingredients.map((ing, index) => (
                <li key={`${ing.name}-${index}`} className="detail__ingredient">
                  <span className="t-body-strong detail__ing-name">{ing.name}</span>
                  {ing.amount && <span className="t-body-sm text-secondary detail__ing-amount">{ing.amount}</span>}
                  <StatusLabel owned={ing.owned} />
                </li>
              ))}
            </ul>
            <AlwaysOwnedNotice
              message="기본 양념과 밥은 등록하지 않아도 '있어요'로 표시해요."
              onOpen={() => setBasicsOpen(true)}
            />
          </section>

          <section aria-labelledby="detail-steps" className="detail__section">
            <SectionHeader id="detail-steps" title="만드는 방법" level={3} />
            <ol className="detail__steps">
              {recipe.steps.map((step, index) => (
                <li key={index} className="detail__step">
                  <span className="detail__step-no num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="fixed-cta">
            <div className="fixed-cta__inner">
              <Button
                size="lg"
                fullWidth
                onClick={() => {
                  cook.reset();
                  setModalOpen(true);
                }}
              >
                요리 완료
              </Button>
            </div>
          </div>

          {modalOpen && (
            <CookDoneModal
              open
              ingredients={recipe.ingredients}
              busy={cook.pending}
              error={cook.error}
              onConfirm={handleConfirm}
              onClose={() => setModalOpen(false)}
            />
          )}

          {basicsOpen && <AlwaysOwnedSheetContainer onClose={() => setBasicsOpen(false)} />}
        </article>
      )}
    </PageContainer>
  );
}
