// RecipeImage — 레시피 상세의 '완성된 요리 사진' (docs/design/components/RecipeImage.md)
// - 입력: GET /api/recipes/:id 응답의 image_url(선택 필드)과 요리명. 사진 자체는 서버가 준 URL을 그대로 쓴다.
// - 상태 3가지:
//   ① URL 없음 → 아무것도 렌더하지 않음(빈 16:9 박스를 강제하지 않는다, FUNCTIONS F09)
//   ② 로딩 중 → 16:9 자리 + '사진을 불러오는 중이에요'(레이아웃이 갑자기 밀리지 않게)
//   ③ 로딩 실패 → 영역을 통째로 숨김(깨진 이미지 아이콘·빈 박스 없음). 제목과 레시피 내용은 그대로 보인다.
// - 사용처: features/recipes/pages/RecipeDetailPage.jsx. API를 직접 부르지 않는 순수 UI다.
// - failedSrc/loadedSrc를 'URL 기준'으로 저장하는 이유: 다른 레시피로 바뀌면 이전 사진의 실패/완료 상태가 자동으로 무효화된다.
import { useState } from 'react';

export default function RecipeImage({ src, title }) {
  const url = typeof src === 'string' ? src.trim() : '';
  const [failedSrc, setFailedSrc] = useState(null);
  const [loadedSrc, setLoadedSrc] = useState(null);

  if (!url || failedSrc === url) return null;
  const loading = loadedSrc !== url;

  return (
    <figure className={`recipe-image ${loading ? 'recipe-image--loading' : ''}`} aria-busy={loading || undefined}>
      <img
        className="recipe-image__img"
        src={url}
        alt={`${title} 완성 사진`}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoadedSrc(url)}
        onError={() => setFailedSrc(url)}
      />
      {loading && <figcaption className="recipe-image__status t-caption">사진을 불러오는 중이에요</figcaption>}
    </figure>
  );
}
