// PageContainer — 모바일 우선 최대 폭(layout.AppMaxWidth) + 배경 + 안전영역 (PageContainer.md)
// variant: 'app'(고정 헤더 아래 여백) | 'auth'(로그인/가입 상단 여백). 내용/내비게이션은 만들지 않는다.
export default function PageContainer({ variant = 'app', className = '', children }) {
  return <main className={`page page--${variant} ${className}`}>{children}</main>;
}
