// S7 레시피 검색 (/recipes/search?q=…) — F13, docs/design/pages/RecipeSearch.md
// 흐름: 검색어 입력 → 제출(버튼·Enter) → validateSearchQuery(형식 검사, 실패면 입력칸 오류·요청 없음)
//       → 주소의 ?q= 를 바꿈(setSearchParams) → q가 바뀌면 useAsyncResource가 fetchRecipeSearch(q) 호출
//       → 서버 순서 그대로 RecipeCard 목록 → 카드 탭 → /recipes/:id
// - 왜 검색어를 주소(?q=)에 두나: 상세 화면에서 '뒤로 가기'로 돌아오면 같은 검색 결과가 다시 보이게 하려고.
//   replace: true로 바꿔서, 검색을 여러 번 해도 브라우저 기록이 쌓이지 않는다(뒤로 가기 한 번이면 들어온 화면으로).
// - 정렬·부족 재료 계산은 서버 몫(클라이언트 재정렬 금지). 결과 0개(정상)와 요청 실패(오류)를 다른 화면으로 보여 준다.
// - 추천 검색어(자동완성, 2026-10-20): 타이핑하면 DB의 요리명·재료명 중 맞는 것 최대 8개를 입력칸 아래 목록으로.
//   메뉴(요리명)를 고르면 바로 상세로, 재료를 고르면 입력칸에 채워 그 재료로 검색한다.
//   접근성: WAI-ARIA combobox 패턴 — 입력칸 role="combobox" + aria-expanded/aria-controls/aria-activedescendant,
//   목록 role="listbox", 항목 role="option" + aria-selected. 포커스는 입력칸에 둔 채 '가리키는 항목'만 바뀐다.
import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import PageContainer from '../../../components/ui/PageContainer.jsx';
import AppHeader from '../../../components/ui/AppHeader.jsx';
import TextField from '../../../components/ui/TextField.jsx';
import Button from '../../../components/ui/Button.jsx';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import RecipeCard from '../components/RecipeCard.jsx';
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource.js';
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle.js';
import { fetchRecipeSearch } from '../recipeService.js';
import { useSearchSuggestions } from '../useSearchSuggestions.js';
import { validateSearchQuery } from '../searchQuery.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

const SEARCH_RESULT_MAX = 20; // 서버가 돌려주는 최대 개수(API.md §4.15) — 꽉 찼을 때 안내용
const SUGGEST_LIST_ID = 'recipe-suggest';
const optionId = (index) => `${SUGGEST_LIST_ID}-option-${index}`;
const SUGGEST_TYPE_LABEL = { recipe: '메뉴', ingredient: '재료' };

export default function RecipeSearchPage() {
  useDocumentTitle('레시피 검색');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // 주소의 q도 화면 규칙으로 한 번 더 걸러 쓴다(직접 친 주소 ?q=%20 같은 값은 검색하지 않음)
  const q = validateSearchQuery(searchParams.get('q')).query;
  const [input, setInput] = useState(q ?? '');
  const [inputError, setInputError] = useState(null);
  const suggest = useSearchSuggestions();

  // q가 없으면 요청하지 않는다(null을 돌려주고 화면은 '안내' 상태)
  const results = useAsyncResource((signal) => (q ? fetchRecipeSearch(q, signal) : Promise.resolve(null)), [q]);

  // 들어온 화면(홈·추천)으로 돌아간다. 주소를 직접 열어 이전 기록이 없으면 홈으로.
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));

  // 검색 실행(제출·재료 추천 선택이 함께 쓴다)
  function runSearch(text) {
    const { query, error } = validateSearchQuery(text);
    setInputError(error);
    if (!query) return;
    if (query === q) results.reload(); // 같은 검색어로 다시 누르면 주소가 그대로라 직접 다시 불러온다
    else setSearchParams({ q: query }, { replace: true });
  }

  function handleSubmit(event) {
    event.preventDefault();
    suggest.close(); // 추천을 고르지 않고 Enter·검색 버튼이면 입력한 말 그대로 검색
    runSearch(input);
  }

  // 추천 항목 고르기: 메뉴 → 상세로 이동(push: 상세에서 뒤로 가기면 이 검색 화면으로), 재료 → 그 이름으로 검색
  function chooseSuggestion(item) {
    suggest.close();
    if (item.type === 'recipe') {
      navigate(`/recipes/${item.id}`);
      return;
    }
    setInput(item.label);
    runSearch(item.label);
  }

  // 키보드: ↓/↑ 항목 옮기기, Enter 가리킨 항목 고르기(가리킨 게 없으면 폼 제출 = 일반 검색), Esc 닫기
  function handleKeyDown(event) {
    if (!suggest.open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); // 입력칸 커서가 맨 앞/뒤로 튀지 않게
      suggest.move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      suggest.close();
    } else if (event.key === 'Enter' && suggest.activeIndex >= 0) {
      event.preventDefault(); // 폼 제출(입력한 말로 검색)을 막고 가리킨 항목을 고른다
      chooseSuggestion(suggest.items[suggest.activeIndex]);
    }
  }

  const listOpen = suggest.open && suggest.items.length > 0;

  const list = results.status === 'success' && Array.isArray(results.data) ? results.data : null;

  return (
    <PageContainer variant="app">
      <AppHeader title="레시피 검색" onBack={goBack} />

      <form className="search-form" role="search" onSubmit={handleSubmit} noValidate>
        {/* position: relative 기준 상자 — 추천 목록을 입력칸 바로 아래에 겹쳐 띄운다 */}
        <div className="search-form__field search-combobox">
          <TextField
            id="recipe-search"
            label="요리명 또는 재료명"
            value={input}
            onChange={(value) => {
              setInput(value);
              if (inputError) setInputError(null);
              suggest.update(value); // 사용자가 타이핑했을 때만 추천 요청
            }}
            placeholder="예: 김치찌개, 두부"
            error={inputError}
            autoComplete="off"
            inputProps={{
              role: 'combobox',
              'aria-autocomplete': 'list',
              'aria-expanded': listOpen,
              'aria-controls': SUGGEST_LIST_ID,
              'aria-activedescendant': listOpen && suggest.activeIndex >= 0 ? optionId(suggest.activeIndex) : undefined,
              onKeyDown: handleKeyDown,
              onBlur: suggest.close, // 다른 곳을 누르면 닫힘(항목 클릭은 아래 onMouseDown으로 blur를 막는다)
            }}
          />
          {listOpen && (
            <ul id={SUGGEST_LIST_ID} className="search-suggest" role="listbox" aria-label="추천 검색어">
              {suggest.items.map((item, index) => (
                <li
                  key={`${item.type}-${item.id ?? item.label}`}
                  id={optionId(index)}
                  className={`search-suggest__option${index === suggest.activeIndex ? ' is-active' : ''}`}
                  role="option"
                  aria-selected={index === suggest.activeIndex}
                  // mousedown 기본 동작(입력칸 blur)을 막아야 목록이 닫히기 전에 click이 처리된다
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseSuggestion(item)}
                >
                  <span className="search-suggest__label">{item.label}</span>
                  <span className={`search-suggest__type search-suggest__type--${item.type}`}>{SUGGEST_TYPE_LABEL[item.type]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" className="search-form__submit">
          검색
        </Button>
      </form>

      <section className="search-results" aria-label="검색 결과">
        {!q && <p className="text-secondary">요리명이나 재료명으로 찾아보세요.</p>}
        {q && results.status === 'loading' && <LoadingSkeleton variant="card" count={3} label="검색하는 중이에요" />}
        {q && results.status === 'error' && <InlineError
            message={pickErrorMessage(results.error, { invalid: '검색어를 다시 확인해 주세요.', fallback: '검색하지 못했어요.' })}
            onRetry={results.reload}
          />}
        {q && list && list.length === 0 && (
          <EmptyState title={`'${q}'에 맞는 레시피가 없어요`} description="다른 요리명이나 재료명으로 찾아보세요." />
        )}
        {q && list && list.length > 0 && (
          <>
            {/* role="status": 화면 낭독기가 결과 개수를 읽어 준다(포커스를 옮기지 않고도 결과가 나왔음을 알림) */}
            <p className="search-results__count t-body-sm text-secondary" role="status">
              레시피 {list.length}개를 찾았어요
            </p>
            {list.length >= SEARCH_RESULT_MAX && (
              <p className="search-results__note t-body-sm text-secondary">
                결과가 많아 {SEARCH_RESULT_MAX}개까지 보여줘요. 검색어를 더 자세히 입력해 보세요.
              </p>
            )}
            <ul className="stack-md">
              {list.map((recipe) => (
                <li key={recipe.id}>
                  <RecipeCard recipe={recipe} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </PageContainer>
  );
}
