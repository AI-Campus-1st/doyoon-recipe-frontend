import { describe, it, expect } from 'vitest';
import { pickErrorMessage, NETWORK_MESSAGE, TOO_MANY_MESSAGE, TIMEOUT_MESSAGE } from './errorMessage.js';

// 사용자 결정(2026-10-19): 서버 오류의 message는 화면에 그대로 쓰지 않고, 화면이 정한 '상황별' 문구를 보여 준다.
describe('pickErrorMessage', () => {
  const messages = { invalid: '입력을 확인해 주세요.', fallback: '다시 시도해 주세요.' };

  it('400이면 서버 message가 아니라 화면의 invalid 문구', () => {
    expect(pickErrorMessage({ status: 400, code: 'INVALID_INPUT', message: '서버 문구' }, messages)).toBe('입력을 확인해 주세요.');
  });
  it('500은 fallback 문구', () => {
    expect(pickErrorMessage({ status: 500, message: '서버 문구' }, messages)).toBe('다시 시도해 주세요.');
  });
  it('네트워크 실패(status 0)는 어느 화면이든 연결 확인 문구, 화면이 따로 정하면 그 문구', () => {
    expect(NETWORK_MESSAGE).toBe('인터넷 연결을 확인하고 다시 시도해 주세요.');
    expect(pickErrorMessage({ status: 0 }, messages)).toBe(NETWORK_MESSAGE);
    expect(pickErrorMessage({ status: 0 }, { ...messages, network: '오프라인이에요.' })).toBe('오프라인이에요.');
  });
  it('404는 notFound 문구를 주면 그 문구, 안 주면 fallback', () => {
    expect(pickErrorMessage({ status: 404 }, { ...messages, notFound: '이미 없어요.' })).toBe('이미 없어요.');
    expect(pickErrorMessage({ status: 404 }, messages)).toBe('다시 시도해 주세요.');
  });
  it('invalid 문구를 주지 않으면 400도 fallback', () => {
    expect(pickErrorMessage({ status: 400, message: '서버 문구' }, { fallback: '다시 시도해 주세요.' })).toBe('다시 시도해 주세요.');
  });
  it('429(시도 횟수 초과)는 어느 화면이든 잠시 후 다시 시도 문구(2026-10-21)', () => {
    expect(TOO_MANY_MESSAGE).toBe('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.');
    expect(pickErrorMessage({ status: 429, message: '서버 문구' }, messages)).toBe(TOO_MANY_MESSAGE);
  });
  it('시간 제한(TIMEOUT)은 어느 화면이든 서버가 늦다는 문구 — 인터넷 탓으로 안내하지 않음(2026-10-21)', () => {
    expect(TIMEOUT_MESSAGE).toBe('서버 응답이 늦어요. 잠시 후 다시 시도해 주세요.');
    expect(pickErrorMessage({ status: 0, code: 'TIMEOUT' }, { ...messages, network: '오프라인이에요.' })).toBe(TIMEOUT_MESSAGE);
  });
});
