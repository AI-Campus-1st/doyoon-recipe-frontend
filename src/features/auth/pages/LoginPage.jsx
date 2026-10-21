// S1 로그인 페이지 (/login) — docs/design/pages/Login.md
// 흐름: 폼 제출 → validateLogin → authService.login → AuthProvider.completeLogin(로그인 표시 저장 + '/' 이동, 토큰은 서버가 쿠키로)
// - 401은 폼 오류(아이디는 유지, 비밀번호는 비움). 네트워크/서버 오류도 입력 유지 후 재제출 가능.
// - 사용자 확정 간격: 아이디 입력칸→비밀번호 라벨 = spacing.LoginFieldGap, 비밀번호 입력칸→로그인 버튼 = spacing.LoginButtonGap.
//   각 필드를 별도 wrapper(.login-form__group)로 감싸고 그룹 간 간격으로 구현한다(라벨 margin으로 처리하지 않음).
import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import PageContainer from '../../../components/ui/PageContainer.jsx';
import TextField from '../../../components/ui/TextField.jsx';
import PasswordField from '../../../components/ui/PasswordField.jsx';
import Button from '../../../components/ui/Button.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { BRAND_NAME } from '../../../components/ui/AppHeader.jsx';
import { useAuth } from '../../../shared/auth/AuthProvider.jsx';
import { useMutation } from '../../../shared/hooks/useMutation.js';
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';
import { validateLogin } from '../validation.js';
import { login } from '../authService.js';

export default function LoginPage() {
  useDocumentTitle('로그인');
  const { user, completeLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const { run, pending } = useMutation(login);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validateLogin({ username, password });
    setFieldErrors(errors);
    setSubmitError('');
    if (errors.username) return usernameRef.current?.focus();
    if (errors.password) return passwordRef.current?.focus();

    const result = await run({ username, password });
    if (result.ok) return completeLogin(result.data.user);
    if (result.skipped) return;
    const { error } = result;
    if (error.status === 401) {
      setPassword('');
      setSubmitError('아이디 또는 비밀번호를 확인해 주세요.');
      passwordRef.current?.focus();
    } else {
      setSubmitError(
        pickErrorMessage(error, {
          invalid: '아이디와 비밀번호를 다시 확인해 주세요.',
          fallback: '로그인하지 못했어요. 다시 시도해 주세요.',
        }),
      );
    }
  }

  return (
    <PageContainer variant="auth">
      <div className="auth-intro">
        <p className="auth-intro__brand">
          <span className="auth-intro__logo">
            <Icon name="pot" />
          </span>
          {BRAND_NAME}
        </p>
        <h1 className="t-page-title">로그인</h1>
        <p className="auth-intro__desc t-body-sm text-secondary">내 재료로, 오늘 한 끼 간단히</p>
      </div>

      <form className="card auth-card login-form" onSubmit={handleSubmit} noValidate>
        <div className="login-form__group">
          <TextField
            ref={usernameRef}
            id="login-username"
            label="아이디"
            value={username}
            onChange={(v) => {
              setUsername(v);
              if (fieldErrors.username) setFieldErrors((e) => ({ ...e, username: undefined }));
            }}
            placeholder="아이디 입력"
            autoComplete="username"
            error={fieldErrors.username}
          />
        </div>
        <div className="login-form__group">
          <PasswordField
            ref={passwordRef}
            id="login-password"
            label="비밀번호"
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
            }}
            placeholder="비밀번호 입력"
            autoComplete="current-password"
            error={fieldErrors.password}
          />
        </div>
        <div className="login-form__submit">
          {submitError && <InlineError message={submitError} />}
          <Button type="submit" size="lg" fullWidth loading={pending} loadingText="로그인 중...">
            로그인
          </Button>
        </div>
      </form>

      <p className="auth-switch t-body-sm text-secondary">
        처음이신가요?{' '}
        <Link className="auth-switch__link" to="/signup">
          회원가입
        </Link>
      </p>
    </PageContainer>
  );
}
