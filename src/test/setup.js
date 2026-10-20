// Vitest 공통 설정: jest-dom 매처(toBeInTheDocument 등) 등록, 테스트마다 DOM/스토리지/HTTP 클라이언트 설정 정리
// - resetHttpClientForTest: httpClient의 모듈 전역 설정이 다음 테스트로 새지 않게 초기화한다(테스트 격리).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { resetHttpClientForTest } from '../shared/api/httpClient.js';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  resetHttpClientForTest();
});
