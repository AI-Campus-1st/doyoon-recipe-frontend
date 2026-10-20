// 화면 오류 경계(Error Boundary) — 화면을 그리다 예상 못 한 오류가 나면 흰 화면 대신 오류 페이지를 보여 준다
// - Error Boundary란: 자식 컴포넌트가 '그리는 중(render)'에 던진 오류를 붙잡는 React 장치. 아직 클래스로만 만들 수 있다.
//   예) 서버 응답에 missing: null이 와서 RecipeCard가 null.length를 읽다 실패 → 원래는 앱 전체가 하얗게 사라짐.
// - 붙잡지 못하는 것: 이벤트 핸들러·비동기 요청 안의 오류(그건 각 화면이 InlineError 등으로 처리).
// - 쓰는 곳: App.jsx가 <Routes>를 감싼다. 주소가 바뀌면(location.key) 새 경계로 바뀌어 오류 상태가 풀린다
//   → '홈으로 가기'·'이전 화면으로'를 누르면 이동한 화면이 정상으로 그려진다.
import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import ErrorPage from './ErrorPage.jsx';

class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.retry = () => this.setState({ error: null }); // 다시 시도: 자식을 처음부터 다시 그림(데이터도 다시 불러옴)
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // 원인 파악용. 오류 이름·메시지만 남기고 토큰·입력값 같은 개인 정보는 남기지 않는다.
    console.error('[화면 오류]', error?.name, error?.message);
  }

  render() {
    if (this.state.error) return <ErrorPage kind="crash" onRetry={this.retry} />;
    return this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <Boundary key={location.key}>{children}</Boundary>;
}
