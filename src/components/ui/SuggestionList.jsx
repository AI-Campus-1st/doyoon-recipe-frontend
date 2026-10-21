// SuggestionList — 입력칸 아래에 겹쳐 뜨는 추천 목록(listbox) (SuggestionList.md, 2026-10-21)
// - 상태·키보드는 shared/hooks/useSuggestions.js가 맡고, 이 컴포넌트는 그리기만 한다.
// - 부모는 position: relative인 `.combobox` 상자 안에 입력칸(TextField)과 이 목록을 함께 둔다.
// - 항목은 role="option" + aria-selected. mousedown 기본 동작(입력칸 blur → 목록 닫힘)을 막아야 click이 처리된다.
export default function SuggestionList({ suggestions, label }) {
  const { open, items, activeIndex, choose, optionId, listId } = suggestions;
  if (!open) return null;
  return (
    <ul id={listId} className="suggest-list" role="listbox" aria-label={label}>
      {items.map((item, index) => (
        <li
          key={`${item.type}-${item.id ?? item.label}`}
          id={optionId(index)}
          className={`suggest-list__option${index === activeIndex ? ' is-active' : ''}`}
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(item)}
        >
          <span className="suggest-list__label">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
