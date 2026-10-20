// 선형 아이콘 모음 (Lucide 스타일을 참고해 직접 그린 SVG, 외부 의존성 없음)
// - 장식용이므로 aria-hidden. 의미는 항상 옆의 텍스트나 IconButton의 ariaLabel이 전달한다.
const PATHS = {
  back: <path d="M15 18l-6-6 6-6" />,
  chevron: <path d="M9 18l6-6-6-6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  alert: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  pot: (
    <>
      <path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-3z" />
      <path d="M2 11h2M20 11h2M9 7c0-1 1-1 1-2M13 7c0-1 1-1 1-2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

export default function Icon({ name, size }) {
  return (
    <svg
      className={size === 'lg' ? 'icon icon--lg' : 'icon'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
