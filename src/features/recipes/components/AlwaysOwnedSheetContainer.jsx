// AlwaysOwnedSheetContainer — 시트가 열릴 때만 GET /api/seasonings를 요청해 AlwaysOwnedSheet에 넘기는 기능 컨테이너
// - 흐름: 페이지의 '목록 보기' → 이 컴포넌트가 마운트 → useAsyncResource(fetchSeasonings) → 시트 표시
//   닫으면 언마운트되며 진행 중 요청도 취소된다. 다시 열면 새로 불러온다(목록이 작아 캐시하지 않음).
// - 네트워크는 여기까지만. 화면 모양은 AlwaysOwnedSheet(순수 UI)가 담당한다.
import AlwaysOwnedSheet from './AlwaysOwnedSheet.jsx';
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource.js';
import { fetchSeasonings } from '../seasoningService.js';

export default function AlwaysOwnedSheetContainer({ onClose }) {
  const seasonings = useAsyncResource(fetchSeasonings);
  return <AlwaysOwnedSheet state={seasonings} onRetry={seasonings.reload} onClose={onClose} />;
}
