// Vite 설정 파일
// - 역할: 개발 서버(/api 프록시), 빌드, Vitest 테스트 환경을 한 곳에서 정의한다.
// - 연결: `npm run dev`는 /api 요청을 Express 서버(API_PROXY_TARGET, 기본 http://localhost:3000)로 넘긴다.
//   API_PROXY_TARGET은 VITE_ 접두사가 없으므로 브라우저 번들에 포함되지 않는다(설정 파일에서만 사용).
// - `npm run dev:mock`은 mode='mock'으로 실행되어 main.jsx가 개발용 가짜 API를 켠다(백엔드 완성 전 화면 확인용).
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      css: false,
    },
  };
});
