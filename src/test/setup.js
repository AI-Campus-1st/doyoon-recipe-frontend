// Vitest 공통 설정: jest-dom 매처(toBeInTheDocument 등) 등록, 테스트마다 DOM/스토리지/HTTP 클라이언트 설정 정리(재시도 대기 0)
// - resetHttpClientForTest: httpClient의 모듈 전역 설정이 다음 테스트로 새지 않게 초기화한다(테스트 격리).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { configureHttpClient, resetHttpClientForTest } from '../shared/api/httpClient.js';

// GET 재시도 대기(실제 1초·3초)를 테스트에서는 0으로 — 연결 실패 화면 테스트가 몇 초씩 걸리지 않게.
// 재시도·시간 제한 자체는 shared/api/httpClient.test.js가 값을 직접 정해 확인한다.
const TEST_TIMING = { retryDelaysMs: [0, 0] };
configureHttpClient(TEST_TIMING);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  resetHttpClientForTest();
  configureHttpClient(TEST_TIMING);
});
