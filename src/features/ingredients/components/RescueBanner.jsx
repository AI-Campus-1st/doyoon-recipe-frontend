// RescueBanner — 홈 최상단 '오늘의 구조 재료' (docs/design/components/RescueBanner.md)
// - 입력: GET /api/rescue 상태({status, data, error}) — items(id/name/d_day), recipes(id/title/cook_time_min), message.
// - 4가지 정상 분기: 임박 있음/없음 × 추천 있음/없음. 로딩·오류는 별도(목록 영역과 독립).
// - 순수 UI: 레시피 이동·재시도·재료 추가 이동·다른 메뉴 보기는 상위(HomePage)가 넘긴 콜백으로 처리.
// - 다른 메뉴 보기(2026-10-20 사용자 결정): 서버가 부를 때마다 추천 레시피를 새로 고르므로 다시 부르기만 하면 된다.
//   다시 부르는 동안(status loading + 이전 data 있음)은 뼈대 화면 대신 지금 내용을 그대로 두고 목록에 aria-busy만 표시한다
//   → 화면이 깜빡이지 않고, 누른 버튼도 사라지지 않아 키보드 포커스가 그대로 남는다.
//   버튼 모양(2026-10-20 사용자 결정): 추천 화면과 같이 '추천 레시피' 제목 오른쪽 끝의 작은 새로고침 아이콘(IconButton size sm).
import { useState } from 'react';
import CardSurface from '../../../components/ui/CardSurface.jsx';
import RecipeLinkRow from '../../../components/ui/RecipeLinkRow.jsx';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import Button from '../../../components/ui/Button.jsx';
import IconButton from '../../../components/ui/IconButton.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { formatUrgentLabel } from '../statusLabel.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

const VISIBLE_ITEMS = 3; // 임박 재료가 많으면 3개만 먼저 보여 주고 같은 배너 안에서 펼친다(UI 제안)

export default function RescueBanner({ state, onRetry, onOpenRecipe, onAddIngredient, onRefreshRecipes }) {
  const [expanded, setExpanded] = useState(false);
  const refreshing = state.status === 'loading' && Boolean(state.data);

  if (state.status === 'loading' && !refreshing) {
    return (
      <section aria-labelledby="rescue-title" className="rescue">
        <h2 id="rescue-title" className="sr-only">오늘의 구조 재료</h2>
        <LoadingSkeleton variant="banner" />
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section aria-labelledby="rescue-title" className="rescue">
        <h2 id="rescue-title" className="sr-only">오늘의 구조 재료</h2>
        <InlineError message={pickErrorMessage(state.error, { fallback: '구조 재료를 불러오지 못했어요.' })} onRetry={onRetry} />
      </section>
    );
  }

  const { items = [], recipes = [], message } = state.data ?? {};
  const urgent = items.length > 0;
  const shownItems = expanded ? items : items.slice(0, VISIBLE_ITEMS);
  const hiddenCount = items.length - VISIBLE_ITEMS;

  return (
    <section aria-labelledby="rescue-title" className="rescue">
      <CardSurface tone={urgent ? 'urgent' : 'soft'} className="rescue__card">
        {urgent ? (
          <>
            <h2 id="rescue-title" className="rescue__title rescue__title--urgent t-card-title">
              <Icon name="alert" />
              오늘 먼저 써보세요
            </h2>
            <p className="t-body-sm text-secondary">유통기한이 가까운 재료가 있어요</p>
            <ul className="rescue__items">
              {shownItems.map((item) => (
                <li key={item.id} className="rescue__item">
                  <span className="rescue__name t-body-strong text-ellipsis" title={item.name}>
                    {item.name}
                  </span>
                  <span className="badge badge--urgent">{formatUrgentLabel(item.d_day)}</span>
                </li>
              ))}
            </ul>
            {hiddenCount > 0 && (
              <Button variant="text" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
                {expanded ? '접기' : `나머지 ${hiddenCount}개 보기`}
              </Button>
            )}
          </>
        ) : (
          <>
            <h2 id="rescue-title" className="rescue__title t-card-title">
              {message || '여유 있어요'}
            </h2>
            <p className="t-body-sm text-secondary">지금 있는 재료로 간단하게 만들어봐요</p>
          </>
        )}

        <div className="rescue__recipes">
          {recipes.length > 0 ? (
            <>
              <div className="rescue__sub-row">
                <h3 id="rescue-recipes-title" className="rescue__sub t-body-strong">추천 레시피</h3>
                {onRefreshRecipes && (
                  <IconButton
                    icon="refresh"
                    size="sm"
                    className="section-refresh"
                    ariaLabel="추천 레시피 다른 메뉴 보기"
                    title="다른 메뉴 보기"
                    aria-busy={refreshing || undefined}
                    onClick={onRefreshRecipes}
                  />
                )}
              </div>
              <ul className="stack-sm" aria-labelledby="rescue-recipes-title" aria-busy={refreshing || undefined}>
                {recipes.map((r) => (
                  <li key={r.id}>
                    <RecipeLinkRow id={r.id} title={r.title} cookTimeMin={r.cook_time_min} onOpen={onOpenRecipe} />
                  </li>
                ))}
              </ul>
            </>
          ) : urgent ? (
            <p className="rescue__none t-body-sm">지금 추천할 레시피가 없어요</p>
          ) : (
            <div className="rescue__none">
              <p className="t-body-sm">추천할 레시피가 없어요</p>
              <Button variant="text" onClick={onAddIngredient}>
                재료 추가
              </Button>
            </div>
          )}
        </div>
      </CardSurface>
    </section>
  );
}
