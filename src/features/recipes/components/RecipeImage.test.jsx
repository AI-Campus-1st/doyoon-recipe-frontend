import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeImage from './RecipeImage.jsx';

describe('RecipeImage — 레시피 완성 사진', () => {
  it('image_url이 없으면 사진 영역 자체를 렌더하지 않는다', () => {
    const { container } = render(<RecipeImage src={null} title="두부조림" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('빈 문자열·공백 URL도 없는 것으로 본다', () => {
    const { container } = render(<RecipeImage src="  " title="두부조림" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('로딩 중에는 자리와 불러오는 중 안내를 보여준다', () => {
    render(<RecipeImage src="https://example.com/a.jpg" title="두부조림" />);
    expect(screen.getByRole('img', { name: '두부조림 완성 사진' })).toBeInTheDocument();
    expect(screen.getByText('사진을 불러오는 중이에요')).toBeInTheDocument();
  });

  it('로드가 끝나면 안내를 지운다', () => {
    render(<RecipeImage src="https://example.com/a.jpg" title="두부조림" />);
    fireEvent.load(screen.getByRole('img', { name: '두부조림 완성 사진' }));
    expect(screen.queryByText('사진을 불러오는 중이에요')).not.toBeInTheDocument();
  });

  it('로딩에 실패하면 영역을 통째로 숨긴다(빈 박스·깨진 아이콘 없음)', () => {
    const { container } = render(<RecipeImage src="https://example.com/broken.jpg" title="두부조림" />);
    fireEvent.error(screen.getByRole('img', { name: '두부조림 완성 사진' }));
    expect(container).toBeEmptyDOMElement();
  });

  it('다른 레시피 사진으로 바뀌면 실패 상태를 초기화한다', () => {
    const { rerender } = render(<RecipeImage src="https://example.com/broken.jpg" title="두부조림" />);
    fireEvent.error(screen.getByRole('img'));
    rerender(<RecipeImage src="https://example.com/ok.jpg" title="계란볶음밥" />);
    expect(screen.getByRole('img', { name: '계란볶음밥 완성 사진' })).toBeInTheDocument();
  });
});
