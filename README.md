# 간단 레시피 추천기 — 프론트엔드 (React + Vite)

product 루트 기준 `src/frontend/`. 백엔드(`src/backend/`)와는 `/api` 계약으로만 연결된다.

## 실행

Node `^20.19.0 || >=22.12.0` 필요 (`node -v`로 확인).

```bash
cd src/frontend
npm install
npm run dev:mock   # 개발용 목업 모드: 백엔드 없이 화면 확인 (http://localhost:5173)
npm run dev        # 실제 API 모드: /api → API_PROXY_TARGET(기본 http://localhost:3000)
npm test           # Vitest + Testing Library
npm run build      # dist/ 생성 (Docker에서는 frontend 이미지의 nginx가 제공 — Dockerfile·nginx.conf)
```

### 목업 모드 사용법

- 처음에는 계정이 없으므로 **회원가입**부터 한다(가입하면 예시 재고 5개가 생김). 데이터는 이 브라우저 localStorage에만 저장된다. 실제 비밀번호는 쓰지 말 것.
- 실패 화면 확인: 브라우저 콘솔에서 `localStorage['mock.fail'] = 'rescue'` (또는 `ingredients`, `one-touch`, `recommendations`, `recipe`, `cook`, `create`, `seasonings`, `search`) 후 새로고침. 해제는 `localStorage.removeItem('mock.fail')`.
- 목업 초기화: `localStorage.removeItem('mock.db')`.
- 목업은 `npm run dev:mock`(Vite mode=`mock`)에서만 켜지며, API 실패를 목업으로 대신하는 fallback이 아니다. `npm run build` 결과에는 포함되지 않는다.

## 폴더 구조와 흐름

```text
src/
├── main.jsx                 진입점 (목업 모드일 때만 mocks 설치)
├── app/                     라우팅(App.jsx), 보호 라우트
├── shared/
│   ├── api/httpClient.js    모든 API 요청의 단일 통로 (Bearer, 204, 오류 계약, 401, 늦은 응답 차단)
│   ├── auth/                토큰 저장소 + AuthProvider(로그인 완료/로그아웃/401 처리)
│   ├── hooks/               useAsyncResource(읽기), useMutation(변경·중복 방지), useDocumentTitle
│   ├── overlay/useOverlay   모달/시트 공통 동작(inert, 스크롤 잠금, 포커스 트랩·복귀, ESC)
│   └── toast/               화면 이동 후에도 보이는 성공 안내
├── components/ui/           순수 UI (API·스토리지·라우터를 모름)
├── features/
│   ├── auth/                로그인·회원가입 (validation.js = 순수 검증 로직)
│   ├── ingredients/         홈·재료 등록 (statusLabel.js, ingredientForm.js = 순수 로직)
│   └── recipes/             추천·상세·요리 완료·레시피 검색 (cookCandidates.js·searchQuery.js = 순수 로직)
├── api/                     목업·테스트 데이터 모음 (운영 화면 코드는 import하지 않음)
│   ├── mock/                dev:mock 데이터: 원터치 16·예시 재고·레시피 5·양념 16+밥·목업 사진
│   └── fixtures/            테스트용 가짜 API 응답(재고·구조 배너·추천·상세·양념·로그인·오류 본문)
├── mocks/mockServer.js      개발용 가짜 API — api/mock 데이터로 요청에 응답 (dev:mock 전용)
├── styles/                  tokens.css(Tokens.md 값) → global.css / pages.css
└── test/                    화면 흐름 테스트
```

목업 데이터를 바꾸려면 `src/api/mock/`, 테스트 응답을 바꾸려면 `src/api/fixtures/`만 고치면 된다. (`shared/api/httpClient.js`는 실제 요청 통로이고, `src/api/`는 데이터 모음이라 역할이 다르다.)

계층: **페이지(컨트롤러) → feature 서비스(xxxService.js) → shared/api/httpClient → /api**. 재사용 UI는 props와 이벤트만 받는다.
