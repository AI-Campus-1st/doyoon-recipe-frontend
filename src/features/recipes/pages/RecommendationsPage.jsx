// S5 추천 레시피 (/recommendations) — docs/design/pages/Recommendations.md
// 흐름: 진입 → fetchRecommendations() → { key_menus, recipes } → 두 영역을 서버 순서 그대로 RecipeCard로 렌더(클라이언트 재정렬 금지) → 카드 탭 → /recipes/:id
// - 위: '자주 해 먹는 대표 메뉴'(key_menus, 최대 3) — 사람들이 많이 만들어 먹는 메뉴 중 지금 만들기 쉬운 순(2026-10-19 사용자 결정).
//   영역 자체가 대표 메뉴라는 뜻이므로 카드에 배지를 달지 않는다. 비어 있으면 영역을 숨긴다.
// - 아래: '내 재료로 만드는 간단한 한 끼'(recipes, 최대 5) — 위 영역에 나온 요리는 서버가 빼고 보낸다.
// - 빈 배열(정상)과 요청 실패(오류)를 다른 화면으로 구분한다. 처음 두 영역은 한 번의 요청이라 로딩·오류도 한 번만 보인다.
// - 영역별 '다른 메뉴 보기'(2026-10-20 사용자 결정): 각 섹션 제목 오른쪽 끝 작은 새로고침 아이콘 버튼.
//   누르면 그 영역만 fetchRecommendationSection(영역, 다른 영역에 보이는 id)로 새로 받아 바꾼다(다른 영역은 그대로).
//   응답 전까지 지금 메뉴를 유지(aria-busy·아이콘 회전), 실패하면 메뉴는 그대로 두고 토스트로만 알린다.
//   두 버튼을 동시에 돌리지 않는다(서로의 '지금 보이는 id'를 기준으로 고르기 때문 — 동시에 바꾸면 겹칠 수 있음).
// - 맨 아래 '레시피 검색' 버튼 → /recipes/search(F13)
// - '기본 양념과 밥은 있다고 본다' 안내 + 목록 보기 → AlwaysOwnedSheetContainer(열 때만 GET /api/seasonings)
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../components/ui/PageContainer.jsx';
import AppHeader from '../../../components/ui/AppHeader.jsx';
import SectionHeader from '../../../components/ui/SectionHeader.jsx';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import Button from '../../../components/ui/Button.jsx';
import IconButton from '../../../components/ui/IconButton.jsx';
import { useToast } from '../../../shared/toast/ToastProvider.jsx';
import { isIgnorableError } from '../../../shared/api/httpClient.js';
import RecipeCard from '../components/RecipeCard.jsx';
import AlwaysOwnedNotice from '../components/AlwaysOwnedNotice.jsx';
import AlwaysOwnedSheetContainer from '../components/AlwaysOwnedSheetContainer.jsx';
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource.js';
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle.js';
import { fetchRecommendations, fetchRecommendationSection } from '../recipeService.js';
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
  const showToast = useToast();
  // 영역별로 새로 받은 목록(없으면 처음 응답 그대로). 처음 응답을 다시 받으면(오류 후 다시 시도) 비운다
  const [override, setOverride] = useState({});
  const [pendingSection, setPendingSection] = useState(null);
  const controllerRef = useRef(null);
  useEffect(() => setOverride({}), [recs.data]);
  useEffect(() => () => controllerRef.current?.abort(), []); // 화면을 떠나면 진행 중인 요청 취소

  const shown = recs.status === 'success';
  const keyMenus = shown ? override.key_menus ?? recs.data.key_menus : [];
  const recipes = shown ? override.recipes ?? recs.data.recipes : [];

  async function refreshSection(section) {
    if (pendingSection) return; // 한 번에 한 영역만
    const others = section === 'key_menus' ? recipes : keyMenus;
    const controller = new AbortController();
    controllerRef.current = controller;
    setPendingSection(section);
    try {
      const list = await fetchRecommendationSection(section, others.map((r) => r.id), controller.signal);
      if (!controller.signal.aborted) setOverride((prev) => ({ ...prev, [section]: list }));
    } catch (error) {
      if (!controller.signal.aborted && !isIgnorableError(error)) showToast('다른 메뉴를 불러오지 못했어요. 다시 시도해 주세요.', 'error');
    } finally {
      if (!controller.signal.aborted) setPendingSection(null);
    }
  }

  // 섹션 제목 오른쪽 끝의 작은 새로고침 버튼(이름은 영역 + '다른 메뉴 보기', 마우스를 올리면 '다른 메뉴 보기')
  const refreshButton = (section, label) => (
    <IconButton
      icon="refresh"
      size="sm"
      className="section-refresh"
      ariaLabel={`${label} 다른 메뉴 보기`}
      title="다른 메뉴 보기"
      aria-busy={pendingSection === section || undefined}
      onClick={() => refreshSection(section)}
    />
  );

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

      {shown && keyMenus.length > 0 && (
        <section className="recs recs--key" aria-labelledby="recs-key-title" aria-busy={pendingSection === 'key_menus' || undefined}>
          <SectionHeader
            id="recs-key-title"
            title="자주 해 먹는 대표 메뉴"
            description="지금 내 냉장고로 만들기 쉬운 순서예요"
            accessory={refreshButton('key_menus', '대표 메뉴')}
          />
          <RecipeList recipes={keyMenus} />
        </section>
      )}

      {shown && (
        <section className="recs" aria-labelledby="recs-main-title" aria-busy={pendingSection === 'recipes' || undefined}>
          <SectionHeader
            id="recs-main-title"
            title="내 재료로 만드는 간단한 한 끼"
            description="30분 이내, 주재료 10개 이하"
            accessory={recipes.length > 0 ? refreshButton('recipes', '간단한 한 끼') : null}
          />
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
