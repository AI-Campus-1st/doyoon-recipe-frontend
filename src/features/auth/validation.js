// 회원가입/로그인 입력 검증 (순수 함수)
// - 역할: 서버로 보내기 전 형식 오류를 필드별 한국어 문구로 돌려준다. 서버 검증을 대체하지 않는다.
// - 사용처: features/auth/pages/LoginPage.jsx, SignupPage.jsx
// - 제약: 아이디는 trim 등 전처리 없이 그대로 검사한다(서버 규칙과 어긋나지 않게).

const USERNAME_RULE = /^[A-Za-z0-9]{4,20}$/;
// bcrypt는 72바이트 뒤를 버린다 → 서버가 400으로 막는 규칙을 화면에서 먼저 알려 준다(한글 1자 = 3바이트)
const PASSWORD_MAX_BYTES = 72;
const byteLength = (text) => new TextEncoder().encode(text).length;

export const MESSAGES = {
  username: '아이디는 영문·숫자 4~20자로 입력해 주세요.',
  password: '비밀번호는 8자 이상 입력해 주세요.',
  passwordSpace: '비밀번호에는 공백을 넣을 수 없어요.',
  passwordTooLong: '비밀번호가 너무 길어요. 영문·숫자 기준 72자 이하로 입력해 주세요.',
  confirm: '비밀번호가 일치하지 않아요.',
  loginUsername: '아이디를 입력해 주세요.',
  loginPassword: '비밀번호를 입력해 주세요.',
};

export function validateSignup({ username, password, confirmPassword }) {
  const errors = {};
  if (!USERNAME_RULE.test(username)) errors.username = MESSAGES.username;
  if ((password ?? '').length < 8) errors.password = MESSAGES.password;
  // 공백(띄어쓰기·탭·줄바꿈·전각 공백)이 한 자리라도 있으면 거부(사용자 결정 2026-10-20 변경, 서버도 400).
  // 길이 안내가 먼저: 7자 + 공백이면 '8자 이상'을 먼저 보여 준다. 로그인 검사(validateLogin)는 그대로 둔다.
  else if (/\s/.test(password)) errors.password = MESSAGES.passwordSpace;
  else if (byteLength(password) > PASSWORD_MAX_BYTES) errors.password = MESSAGES.passwordTooLong;
  if (password !== confirmPassword) errors.confirmPassword = MESSAGES.confirm;
  return errors;
}

export function validateLogin({ username, password }) {
  const errors = {};
  if (!(username ?? '').trim()) errors.username = MESSAGES.loginUsername;
  if (!(password ?? '').trim()) errors.password = MESSAGES.loginPassword;
  return errors;
}
