// 앱 진입점
// - 개발용 목업 모드: `npm run dev:mock`(vite --mode mock → import.meta.env.MODE === 'mock')일 때만 가짜 API(src/mocks)를 httpClient에 끼운다.
//   일반 dev/build에서는 이 분기가 false로 고정되어 목업 코드가 번들에 포함되지 않는다.
//   API 실패 시 목업으로 '대체'하는 fallback이 아니라, 처음부터 명시적으로 켜는 별도 모드다.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import { warmUpServer } from './shared/api/httpClient.js';
import './styles/tokens.css';
import './styles/global.css';
import './styles/pages.css';

async function bootstrap() {
  if (import.meta.env.MODE === 'mock') {
    const { installMockServer } = await import('./mocks/mockServer.js');
    installMockServer();
  } else {
    // 잠든 배포 서버(Render 무료)를 화면이 뜨는 동안 미리 깨운다 — 결과는 기다리지 않음(2026-10-21)
    warmUpServer();
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
