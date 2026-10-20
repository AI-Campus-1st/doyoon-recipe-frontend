import { describe, it, expect } from 'vitest';
import { validateSignup, validateLogin } from './validation.js';

describe('validateSignup', () => {
  const ok = { username: 'cook01', password: 'password1', confirmPassword: 'password1' };

  it('올바른 입력은 오류가 없다', () => {
    expect(validateSignup(ok)).toEqual({});
  });
  it.each(['abc', 'a'.repeat(21), 'cook_01', '요리사01', ' cook01', ''])('아이디 %j 는 거부', (username) => {
    expect(validateSignup({ ...ok, username }).username).toBe('아이디는 영문·숫자 4~20자로 입력해 주세요.');
  });
  it('아이디 경계 4자, 20자는 허용', () => {
    expect(validateSignup({ ...ok, username: 'abcd' }).username).toBeUndefined();
    expect(validateSignup({ ...ok, username: 'a'.repeat(20) }).username).toBeUndefined();
  });
  it('비밀번호 7자는 거부, 8자는 허용', () => {
    expect(validateSignup({ ...ok, password: '1234567', confirmPassword: '1234567' }).password).toBe(
      '비밀번호는 8자 이상 입력해 주세요.',
    );
    expect(validateSignup({ ...ok, password: '12345678', confirmPassword: '12345678' }).password).toBeUndefined();
  });
  // bcrypt는 72바이트 뒤를 버리므로 서버가 400으로 막는다 → 화면에서도 먼저 알려 준다(2026-10-19)
  it('비밀번호 72바이트까지 허용, 넘으면 거부(한글은 1자 3바이트)', () => {
    const ok72 = 'a'.repeat(72);
    expect(validateSignup({ ...ok, password: ok72, confirmPassword: ok72 }).password).toBeUndefined();
    const long = 'a'.repeat(73);
    expect(validateSignup({ ...ok, password: long, confirmPassword: long }).password).toBe(
      '비밀번호가 너무 길어요. 영문·숫자 기준 72자 이하로 입력해 주세요.',
    );
    const korean = '가'.repeat(25); // 75바이트
    expect(validateSignup({ ...ok, password: korean, confirmPassword: korean }).password).toBe(
      '비밀번호가 너무 길어요. 영문·숫자 기준 72자 이하로 입력해 주세요.',
    );
  });
  // 사용자 결정(2026-10-20 변경): 비밀번호에 공백이 한 자리라도 있으면 거부(서버도 400)
  it('비밀번호에 공백(띄어쓰기·탭·줄바꿈·전각 공백)이 하나라도 있으면 거부', () => {
    for (const spaced of [' '.repeat(8), ' \t\n\u3000    ', 'pass word1', '  pass12  ', 'password1 ', 'password\t1', 'pass\u3000word1']) {
      expect(validateSignup({ ...ok, password: spaced, confirmPassword: spaced }).password).toBe(
        '비밀번호에는 공백을 넣을 수 없어요.',
      );
    }
  });
  it('공백 검사보다 길이 안내가 먼저(7자 + 공백은 8자 안내)', () => {
    expect(validateSignup({ ...ok, password: 'pass wd', confirmPassword: 'pass wd' }).password).toBe('비밀번호는 8자 이상 입력해 주세요.');
  });
  it('확인값 불일치', () => {
    expect(validateSignup({ ...ok, confirmPassword: 'password2' }).confirmPassword).toBe('비밀번호가 일치하지 않아요.');
  });
});

describe('validateLogin', () => {
  it('공백만 있는 값은 막는다', () => {
    const errors = validateLogin({ username: '   ', password: '' });
    expect(errors.username).toBe('아이디를 입력해 주세요.');
    expect(errors.password).toBe('비밀번호를 입력해 주세요.');
  });
  it('값이 있으면 통과', () => {
    expect(validateLogin({ username: 'cook01', password: 'x' })).toEqual({});
  });
});
