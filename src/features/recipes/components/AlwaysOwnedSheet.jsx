// AlwaysOwnedSheet — 항상 있다고 보는 재료 목록 하단 시트 (1단계: 보기 전용)
// - 입력: GET /api/seasonings 상태({status, data, error}). type 'seasoning'은 '양념', 'staple'은 '밥' 묶음으로 나눈다.
// - 순수 UI: 요청·재시도는 onRetry, 닫기는 onClose로 상위에 알린다. 끄기/고르기(2단계)는 아직 없다.
// - 공통 시트 동작(포커스 진입·트랩·ESC·닫힌 뒤 '목록 보기' 버튼으로 포커스 복귀)은 BottomSheet → Modal이 처리한다.
import BottomSheet from '../../../components/ui/BottomSheet.jsx';
import Button from '../../../components/ui/Button.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton.jsx';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';

const GROUPS = [
  { type: 'seasoning', label: '양념' },
  { type: 'staple', label: '밥' },
];

export default function AlwaysOwnedSheet({ state, onRetry, onClose }) {
  const items = state.status === 'success' ? state.data : [];
  return (
    <BottomSheet open title="항상 있다고 보는 재료" onClose={onClose}>
      <p className="t-body-sm text-secondary always-owned__desc">
        냉장고에 등록하지 않아도 추천과 재료 표시에서 있다고 계산해요.
      </p>

      {state.status === 'loading' && <LoadingSkeleton variant="line" count={3} label="목록을 불러오는 중이에요" />}
      {state.status === 'error' && <InlineError message={pickErrorMessage(state.error, { fallback: '목록을 불러오지 못했어요.' })} onRetry={onRetry} />}

      {state.status === 'success' &&
        GROUPS.map(({ type, label }) => {
          const names = items.filter((item) => item.type === type).map((item) => item.name);
          if (names.length === 0) return null;
          const headingId = `always-owned-${type}`;
          return (
            <section key={type} className="always-owned__group" aria-labelledby={headingId}>
              <h3 id={headingId} className="t-body-strong always-owned__label">
                {label}
              </h3>
              <ul className="always-owned__chips" aria-labelledby={headingId}>
                {names.map((name) => (
                  <li key={name} className="always-owned__chip">
                    {name}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

      {state.status === 'success' && (
        <p className="t-caption text-muted always-owned__foot">
          이 목록에 없는 재료는 냉장고에 등록해야 &apos;있어요&apos;로 표시돼요. 목록의 양념이 집에 없으면 미리 준비해 주세요.
        </p>
      )}

      <div className="overlay__actions">
        <Button variant="secondary" fullWidth onClick={onClose}>
          닫기
        </Button>
      </div>
    </BottomSheet>
  );
}
