// S5 추천 레시피 (/recommendations) — docs/design/pages/Recommendations.md
// 흐름: 진입 → fetchRecommendations() → { key_menus, recipes } → 두 영역을 서버 순서 그대로 RecipeCard로 렌더(클라이언트 재정렬 금지) → 카드 탭 → /recipes/:id
// - 위: '자주 해 먹는 대표 메뉴'(key_menus, 최대 3) — 사람들이 많이 만들어 먹는 메뉴 중 지금 만들기 쉬운 순(2026-10-19 사용자 결정).
//   영역 자체가 대표 메뉴라는 뜻이므로 카드에 배지를 달지 않는다. 비어 있으면 영역을 숨긴다.
// - 아래: '내 재료로 만드는 간단한 한 끼'(recipes, 최대 5) — 위 영역에 나온 요리는 서버가 빼고 보낸다.
// - 빈 배열(정상)과 요청 실패(오류)를 다른 화면으로 구분한다. 두 영역은 한 번의 요청이라 로딩·오류도 한 번만 보인다.
// - 맨 아래 '레시피 검색' 버튼 → /recipes/search(F13)
// - '기본 양념과 밥은 있다고 본다' 안내 + 목록 보기 → AlwaysOwnedSheetContainer(열 때만 GET /api/seasonings)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../components/ui/PageContainer.jsx';
import AppHeader from '../../../components/ui/AppHeader.jsx';
import SectionHeader from '../../../components/ui/SectionHeader.jsx';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import Button from '../../../components/ui/Button.jsx';
import RecipeCard from '../components/RecipeCard.jsx';
import AlwaysOwnedNotice from '../components/AlwaysOwnedNotice.jsx';
import AlwaysOwnedSheetContainer from '../components/AlwaysOwnedSheetContainer.jsx';
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource.js';
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle.js';
import { fetchRecommendations } from '../recipeService.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

function RecipeList({ recipes }) {
  return (
    <ul className="stack-md">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <RecipeCard recipe={recipe} />
        </li>
      ))}
    </ul>
  );
}

export default function RecommendationsPage() {
  useDocumentTitle('추천 레시피');
  const navigate = useNavigate();
  const recs = useAsyncResource(fetchRecommendations);
  const [basicsOpen, setBasicsOpen] = useState(false);
  const keyMenus = recs.status === 'success' ? recs.data.key_menus : [];
  const recipes = recs.status === 'success' ? recs.data.recipes : [];

  return (
    <PageContainer variant="app">
      <AppHeader title="추천 레시피" onBack={() => navigate('/')} />
      <AlwaysOwnedNotice message="기본 양념과 밥은 집에 있다고 보고 추천해요." onOpen={() => setBasicsOpen(true)} />

      {recs.status === 'loading' && (
        <div className="recs">
          <LoadingSkeleton variant="card" count={3} />
        </div>
      )}
      {recs.status === 'error' && (
        <div className="recs">
          <InlineError message={pickErrorMessage(recs.error, { fallback: '추천을 불러오지 못했어요.' })} onRetry={recs.reload} />
        </div>
      )}

      {recs.status === 'success' && keyMenus.length > 0 && (
        <section className="recs recs--key" aria-labelledby="recs-key-title">
          <SectionHeader id="recs-key-title" title="자주 해 먹는 대표 메뉴" description="지금 내 냉장고로 만들기 쉬운 순서예요" />
          <RecipeList recipes={keyMenus} />
        </section>
      )}

      {recs.status === 'success' && (
        <section className="recs" aria-labelledby="recs-main-title">
          <SectionHeader id="recs-main-title" title="내 재료로 만드는 간단한 한 끼" description="30분 이내, 주재료 10개 이하" />
          {recipes.length === 0 ? (
            <EmptyState
              title="지금 추천할 레시피가 없어요"
              description="재료를 더 등록해 보세요."
              actions={
                <>
                  <Button variant="secondary" fullWidth onClick={() => navigate('/ingredients/new')}>
                    냉장고에 재료 더 추가하기
                  </Button>
                  <Button variant="text" fullWidth onClick={() => navigate('/')}>
                    내 냉장고로
                  </Button>
                </>
              }
            />
          ) : (
            <RecipeList recipes={recipes} />
          )}
        </section>
      )}

      {/* 추천 목록에 원하는 요리가 없을 때 직접 찾기(F13). 성공·빈 상태·오류와 상관없이 늘 보인다 */}
      <div className="recs-search">
        <p className="t-body-sm text-secondary">찾는 요리가 따로 있나요?</p>
        <Button variant="secondary" fullWidth onClick={() => navigate('/recipes/search')}>
          레시피 검색
        </Button>
      </div>

      {basicsOpen && <AlwaysOwnedSheetContainer onClose={() => setBasicsOpen(false)} />}
    </PageContainer>
  );
}
