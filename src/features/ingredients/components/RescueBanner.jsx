// RescueBanner — 홈 최상단 '오늘의 구조 재료' (docs/design/components/RescueBanner.md)
// - 입력: GET /api/rescue 상태({status, data, error}) — items(id/name/d_day), recipes(id/title/cook_time_min), message.
// - 4가지 정상 분기: 임박 있음/없음 × 추천 있음/없음. 로딩·오류는 별도(목록 영역과 독립).
// - 순수 UI: 레시피 이동·재시도·재료 추가 이동은 상위(HomePage)가 넘긴 콜백으로 처리.
import { useState } from 'react';
import CardSurface from '../../../components/ui/CardSurface.jsx';
import RecipeLinkRow from '../../../components/ui/RecipeLinkRow.jsx';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { formatUrgentLabel } from '../statusLabel.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

const VISIBLE_ITEMS = 3; // 임박 재료가 많으면 3개만 먼저 보여 주고 같은 배너 안에서 펼친다(UI 제안)

export default function RescueBanner({ state, onRetry, onOpenRecipe, onAddIngredient }) {
  const [expanded, setExpanded] = useState(false);

  if (state.status === 'loading') {
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
              <h3 className="rescue__sub t-body-strong">추천 레시피</h3>
              <ul className="stack-sm">
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
