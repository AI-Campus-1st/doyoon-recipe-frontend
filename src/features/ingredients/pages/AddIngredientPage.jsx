// S4 재료 등록 (/ingredients/new) — docs/design/pages/AddIngredient.md
// 흐름 ①원터치: 타일 탭 → createIngredient({name}) → 토스트 → '/' (홈이 다시 GET하므로 새 목록 표시)
// 흐름 ②직접 입력: 제출 → validateCreateForm → buildCreateIngredientBody(날짜 없으면 키 생략) → POST → 토스트 → '/'
// - 두 방식은 같은 useMutation을 공유해 동시에 두 번 등록되지 않게 한다.
// - 원터치 목록 GET 실패여도 직접 입력 폼은 그대로 사용 가능. 실패 시 입력값 유지, 홈 이동 없음.
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../components/ui/PageContainer.jsx';
import AppHeader from '../../../components/ui/AppHeader.jsx';
import SectionHeader from '../../../components/ui/SectionHeader.jsx';
import TextField from '../../../components/ui/TextField.jsx';
import DateField from '../../../components/ui/DateField.jsx';
import Button from '../../../components/ui/Button.jsx';
import InlineError from '../../../components/ui/InlineError.jsx';
import OneTouchGrid from '../components/OneTouchGrid.jsx';
import { useToast } from '../../../shared/toast/ToastProvider.jsx';
import { useAsyncResource } from '../../../shared/hooks/useAsyncResource.js';
import { useMutation } from '../../../shared/hooks/useMutation.js';
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle.js';
import { pickErrorMessage } from '../../../shared/utils/errorMessage.js';
import { createIngredient, fetchOneTouch } from '../ingredientService.js';
import { buildCreateIngredientBody, validateCreateForm } from '../ingredientForm.js';

// 받침 유무에 따라 '을/를' 선택: '대파를', '감자를', '두부를', '햄을'
function withObjectParticle(word) {
  const last = word.charCodeAt(word.length - 1);
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return `${word}${hasBatchim ? '을' : '를'}`;
}

const ALWAYS_OWNED_MESSAGE = '양념은 등록하지 않아도 항상 있다고 보고 추천해요.';

export default function AddIngredientPage() {
  useDocumentTitle('재료 등록');
  const navigate = useNavigate();
  const showToast = useToast();
  const oneTouch = useAsyncResource(fetchOneTouch);
  const create = useMutation(createIngredient);

  const [source, setSource] = useState(null); // 'tile' | 'form' — 오류를 어느 영역에 보여줄지
  const [pendingName, setPendingName] = useState(null);
  const [name, setName] = useState('');
  const [expiryDate, setExpiryDate] = useState(''); // 선택 사항, 초기값 빈 문자열
  const [errors, setErrors] = useState({});
  const nameRef = useRef(null);

  async function register(body, from) {
    setSource(from);
    const result = await create.run(body);
    if (!result.ok) {
      // 양념은 재고로 등록하지 않는다(사용자 결정 2026-10-19, API 400 ALWAYS_OWNED) → 재료명 칸 오류로 안내
      if (from === 'form' && result.error?.code === 'ALWAYS_OWNED') {
        setErrors((e) => ({ ...e, name: ALWAYS_OWNED_MESSAGE }));
        create.reset();
        nameRef.current?.focus();
      }
      return false;
    }
    showToast(`${withObjectParticle(result.data.name)} 등록했어요`);
    navigate('/');
    return true;
  }

  async function handlePick(itemName) {
    if (create.pending) return;
    setPendingName(itemName);
    await register({ name: itemName }, 'tile');
    setPendingName(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validateCreateForm({ name, expiryDate });
    setErrors(found);
    if (found.name) return nameRef.current?.focus();
    if (found.expiryDate) return;
    await register(buildCreateIngredientBody({ name, expiryDate }), 'form');
  }

  const failMessage = create.error
    ? pickErrorMessage(create.error, {
        // 원터치는 이름이 정해져 있어 입력 확인 문구가 맞지 않으므로 일반 실패 문구만 쓴다
        invalid: source === 'form' ? '재료명과 유통기한을 다시 확인해 주세요.' : undefined,
        fallback: '재료를 등록하지 못했어요. 다시 시도해 주세요.',
      })
    : null;

  return (
    <PageContainer variant="app">
      <AppHeader title="재료 등록" onBack={() => navigate('/')} />

      <div className="add-sections">
        <OneTouchGrid
          state={oneTouch}
          onRetry={oneTouch.reload}
          onPick={handlePick}
          pendingName={pendingName}
          locked={create.pending}
          error={source === 'tile' ? failMessage : null}
        />

        <section aria-labelledby="manual-title" className="manual">
          <SectionHeader id="manual-title" title="직접 입력하기" />
          <form className="stack-lg" onSubmit={handleSubmit} noValidate>
            <TextField
              ref={nameRef}
              id="ingredient-name"
              label="재료명"
              required
              value={name}
              onChange={(v) => {
                setName(v);
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              placeholder="예: 닭다리살"
              error={errors.name}
            />
            <DateField
              id="ingredient-expiry"
              label="유통기한"
              optional
              value={expiryDate}
              onChange={(v) => {
                setExpiryDate(v);
                if (errors.expiryDate) setErrors((e) => ({ ...e, expiryDate: undefined }));
              }}
              error={errors.expiryDate}
              helperText="날짜를 비워 두면 기본 보관 기한을 적용해요. 등록되지 않은 재료는 7일로 설정돼요."
            />
            {source === 'form' && failMessage && <InlineError message={failMessage} />}
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={create.pending && source === 'form'}
              disabled={create.pending}
              loadingText="등록 중..."
            >
              재료 등록
            </Button>
            <p className="t-caption text-muted">자동으로 정한 기한은 관리용 예상치예요. 실제 제품 표시와 보관 상태를 확인해 주세요.</p>
          </form>
        </section>
      </div>
    </PageContainer>
  );
}
