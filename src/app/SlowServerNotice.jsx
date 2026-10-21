// 느린 서버 안내 — 요청이 5초 넘게 걸리는 동안 화면 위쪽에 '서버를 깨우는 중' 문구를 띄운다(2026-10-21)
// - 배경: 배포 서버(Render 무료)는 15분 쉬면 잠들고 깨는 데 50초+ 걸린다. 안내가 없으면 고장으로 보인다.
// - 상태는 httpClient의 subscribeSlowRequests가 알려 준다(어느 화면의 요청이든 하나라도 느리면 표시).
// - 화면 낭독기에는 role=status(aria-live polite)로 한 번 읽힌다. 버튼을 가리지 않게 pointer-events 없음.
import { useEffect, useState } from 'react';
import { subscribeSlowRequests } from '../shared/api/httpClient.js';

export const SLOW_SERVER_MESSAGE = '서버를 깨우는 중이에요. 처음 접속하면 1분 정도 걸릴 수 있어요.';

export default function SlowServerNotice() {
  const [slow, setSlow] = useState(false);
  useEffect(() => subscribeSlowRequests(setSlow), []);
  return (
    <div className="slow-notice-region" role="status" aria-live="polite">
      {slow && <div className="slow-notice">{SLOW_SERVER_MESSAGE}</div>}
    </div>
  );
}
