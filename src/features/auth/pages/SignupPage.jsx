// S2 회원가입 페이지 (/signup) — docs/design/pages/Signup.md
// 흐름: 제출 → validateSignup → authService.signup({username,password}) → completeLogin → '/'
// - 409 DUPLICATE: 아이디 필드 아래 오류 + 포커스. 400: 상황별 안내(서버 문구는 쓰지 않음). 그 외: 폼 아래 요청 실패 안내. 입력은 보존.
import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import PageContainer from '../../../components/ui/PageContainer.jsx';
import AppHeader from '../../../components/ui/AppHeader.jsx';
import TextField from '../../../components/ui/TextField.jsx';
import PasswordField from '../../../components/ui/PasswordField.jsx';
import Button from '../../../components/ui/Button.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import { useAuth } from '../../../shared/auth/AuthProvider.jsx';
import { useMutation } from '../../../shared/hooks/useMutation.js';
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';
import { validateSignup } from '../validation.js';
import { signup } from '../authService.js';

export default function SignupPage() {
  useDocumentTitle('회원가입');
  const navigate = useNavigate();
  const { token, completeLogin } = useAuth();
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const refs = { username: useRef(null), password: useRef(null), confirmPassword: useRef(null) };
  const { run, pending } = useMutation(signup);

  if (token) return <Navigate to="/" replace />;

  const update = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined })); // 수정한 필드의 오류만 해제
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    const found = validateSignup(form);
    setErrors(found);
    const firstInvalid = ['username', 'password', 'confirmPassword'].find((k) => found[k]);
    if (firstInvalid) return refs[firstInvalid].current?.focus();

    const result = await run({ username: form.username, password: form.password });
    if (result.ok) return completeLogin(result.data.token);
    if (result.skipped) return;
    const { error } = result;
    if (error.status === 409) {
      setErrors({ username: '이미 사용 중인 아이디예요.' });
      refs.username.current?.focus();
    } else {
      setSubmitError(
        pickErrorMessage(error, {
          invalid: '아이디와 비밀번호 형식을 다시 확인해 주세요.',
          fallback: '회원가입하지 못했어요. 다시 시도해 주세요.',
        }),
      );
    }
  }

  return (
    <PageContainer variant="app">
      <AppHeader title="회원가입" onBack={() => navigate('/login')} />
      <div className="signup-intro">
        <p className="signup-intro__headline">냉장고를 함께 관리해요</p>
        <p className="t-body-sm text-secondary">재료를 기록하고 한 끼를 추천해요</p>
      </div>

      <form className="stack-lg" onSubmit={handleSubmit} noValidate>
        <TextField
          ref={refs.username}
          id="signup-username"
          label="아이디"
          value={form.username}
          onChange={update('username')}
          placeholder="4~20자 영문·숫자"
          autoComplete="username"
          helperText="영문과 숫자만 4~20자로 입력해 주세요."
          error={errors.username}
        />
        <PasswordField
          ref={refs.password}
          id="signup-password"
          label="비밀번호"
          value={form.password}
          onChange={update('password')}
          placeholder="8자 이상"
          autoComplete="new-password"
          helperText="공백 없이 8자 이상 입력해 주세요."
          error={errors.password}
        />
        <PasswordField
          ref={refs.confirmPassword}
          id="signup-confirm"
          label="비밀번호 확인"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          placeholder="다시 한 번 입력"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />
        <div className="signup-submit">
          {submitError && <InlineError message={submitError} />}
          <Button type="submit" size="lg" fullWidth loading={pending} loadingText="가입 중...">
            회원가입
          </Button>
        </div>
      </form>

      <p className="auth-switch t-body-sm text-secondary">
        이미 계정이 있나요?{' '}
        <Link className="auth-switch__link" to="/login">
          로그인
        </Link>
      </p>
    </PageContainer>
  );
}
