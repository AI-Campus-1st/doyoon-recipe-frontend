import { describe, it, expect } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp, deferred } from './renderApp.jsx';
// 가짜 API 응답 본문은 src/api/fixtures/에 모아 두었다.
import { INVENTORY, RESCUE, RESCUE_EMPTY, EXPIRED_DELETED_ONE, SERVER_ERROR, NOT_FOUND, INVALID_INPUT } from '../api/fixtures/index.js';

describe('S3 홈', () => {
  it('H1 하나, 서버 순서 유지, 동일 이름 별도 행, 상태 문구', async () => {
    mockApi({ 'GET /rescue': () => [200, RESCUE], 'GET /ingredients': () => [200, INVENTORY] });
    renderApp('/');
    await screen.findByText('총 5개');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const rows = screen.getAllByRole('button', { name: /수정하기$/ });
    expect(rows.map((r) => r.getAttribute('aria-label').split(',')[0])).toEqual(['우유', '대파', '두부', '두부', '양파']);
    expect(screen.getByText('2일 지남 · 만료')).toBeInTheDocument();
    expect(screen.getAllByText('오늘 만료 · 임박').length).toBeGreaterThan(0);
    expect(screen.getByText('D-4 · 주의')).toBeInTheDocument();
    expect(screen.getByText('D-10 · 여유')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /만료 재료 일괄 삭제/ })).toBeInTheDocument();
  });

  it('배너 실패는 목록에 번지지 않는다', async () => {
    mockApi({ 'GET /rescue': () => [500, SERVER_ERROR], 'GET /ingredients': () => [200, INVENTORY] });
    renderApp('/');
    expect(await screen.findByText('구조 재료를 불러오지 못했어요.')).toBeInTheDocument();
    expect(await screen.findByText('총 5개')).toBeInTheDocument();
  });

  it('임박 없음(정상 빈 상태)은 여유 배너, 목록 빈 상태와 구분', async () => {
    mockApi({ 'GET /rescue': () => [200, RESCUE_EMPTY], 'GET /ingredients': () => [200, []] });
    renderApp('/');
    expect(await screen.findByText('여유 있어요')).toBeInTheDocument();
    expect(await screen.findByText('아직 등록한 재료가 없어요')).toBeInTheDocument();
    expect(screen.queryByText(/불러오지 못했어요/)).not.toBeInTheDocument();
  });

  it('만료 항목이 없으면 일괄 삭제를 숨긴다(임박만 있어도 숨김)', async () => {
    mockApi({ 'GET /rescue': () => [200, RESCUE], 'GET /ingredients': () => [200, INVENTORY.slice(1)] });
    renderApp('/');
    await screen.findByText('총 4개');
    expect(screen.queryByRole('button', { name: /만료 재료 일괄 삭제/ })).not.toBeInTheDocument();
  });

  it('편집: 해당 id 날짜로 초기화, 변경 없으면 저장 비활성, PATCH는 expiry_date만, 성공 후 두 GET 재조회', async () => {
    const calls = mockApi({
      'GET /rescue': () => [200, RESCUE],
      'GET /ingredients': () => [200, INVENTORY],
      'PATCH /ingredients/4': () => [200, { ...INVENTORY[3], expiry_date: '2026-10-21' }],
    });
    renderApp('/');
    const user = userEvent.setup();
    const rows = await screen.findAllByRole('button', { name: /^두부,/ });
    await user.click(rows[1]); // id 4
    const dialog = await screen.findByRole('dialog', { name: '두부' });
    const date = within(dialog).getByLabelText(/유통기한/);
    expect(date).toHaveValue('2026-10-19');
    expect(within(dialog).getByRole('button', { name: '변경 저장' })).toBeDisabled();
    await user.clear(date);
    await user.type(date, '2026-10-21');
    await user.click(within(dialog).getByRole('button', { name: '변경 저장' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const patch = calls.find((c) => c.key === 'PATCH /ingredients/4');
    expect(patch.body).toEqual({ expiry_date: '2026-10-21' });
    expect(calls.filter((c) => c.key === 'GET /rescue')).toHaveLength(2);
    expect(calls.filter((c) => c.key === 'GET /ingredients')).toHaveLength(2);
    expect(await screen.findByText('유통기한을 변경했어요')).toBeInTheDocument();
  });

  it('저장 후 목록을 새로 불러와도 키보드 포커스는 방금 고친 재료 줄로 돌아온다(순서가 바뀌어도 같은 id)', async () => {
    const updated = { ...INVENTORY[3], expiry_date: '2026-10-30', d_day: 15, status: 'ok' };
    let listCalls = 0;
    const second = deferred(); // 재조회 응답을 잡아 두어 '불러오는 중'(줄이 잠시 사라지는 순간)을 실제로 거치게 한다
    mockApi({
      'GET /rescue': () => [200, RESCUE],
      'GET /ingredients': async () => {
        listCalls += 1;
        if (listCalls === 1) return [200, INVENTORY];
        await second.promise;
        // 두 번째 조회: id 4의 날짜가 늦어져 맨 뒤로 이동
        return [200, [...INVENTORY.filter((i) => i.id !== 4), updated]];
      },
      'PATCH /ingredients/4': () => [200, updated],
    });
    renderApp('/');
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: /^두부,/ }))[1]); // id 4
    const dialog = await screen.findByRole('dialog', { name: '두부' });
    const date = within(dialog).getByLabelText(/유통기한/);
    await user.clear(date);
    await user.type(date, '2026-10-30');
    await user.click(within(dialog).getByRole('button', { name: '변경 저장' }));
    await waitFor(() => expect(listCalls).toBe(2));
    second.resolve();
    await waitFor(() => {
      const rows = screen.getAllByRole('button', { name: /수정하기$/ });
      expect(rows.at(-1)).toHaveFocus(); // 맨 뒤로 간 id 4 줄
    });
    expect(screen.getAllByRole('button', { name: /수정하기$/ }).at(-1).getAttribute('aria-label')).toMatch(/^두부,/);
  });

  it('저장한 재료가 다시 불러온 목록에 없으면(그새 삭제) 재고 목록 제목으로 포커스', async () => {
    let listCalls = 0;
    const second = deferred();
    mockApi({
      'GET /rescue': () => [200, RESCUE],
      'GET /ingredients': async () => {
        listCalls += 1;
        if (listCalls === 1) return [200, INVENTORY];
        await second.promise;
        return [200, INVENTORY.filter((i) => i.id !== 5)];
      },
      'PATCH /ingredients/5': () => [200, { ...INVENTORY[4], expiry_date: '2026-10-30' }],
    });
    renderApp('/');
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: /^양파,/ }))[0]);
    const dialog = await screen.findByRole('dialog', { name: '양파' });
    const date = within(dialog).getByLabelText(/유통기한/);
    await user.clear(date);
    await user.type(date, '2026-10-30');
    await user.click(within(dialog).getByRole('button', { name: '변경 저장' }));
    await waitFor(() => expect(listCalls).toBe(2));
    second.resolve();
    await waitFor(() => expect(screen.getByRole('heading', { name: '재고 목록' })).toHaveFocus());
  });

  it('삭제 확인 취소: 요청 없음, 시트 유지, 재료 삭제 버튼으로 포커스 복귀', async () => {
    const calls = mockApi({ 'GET /rescue': () => [200, RESCUE], 'GET /ingredients': () => [200, INVENTORY] });
    renderApp('/');
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: /^양파,/ }))[0]);
    const sheet = await screen.findByRole('dialog', { name: '양파' });
    const deleteBtn = within(sheet).getByRole('button', { name: '재료 삭제' });
    await user.click(deleteBtn);
    const confirm = await screen.findByRole('alertdialog', { name: '이 재료를 냉장고에서 삭제할까요?' });
    await user.click(within(confirm).getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '양파' })).toBeInTheDocument();
    expect(deleteBtn).toHaveFocus();
    expect(calls.some((c) => c.key.startsWith('DELETE'))).toBe(false);
  });

  it('개별 삭제 204: JSON 파싱 없이 성공 처리 후 재조회', async () => {
    const calls = mockApi({
      'GET /rescue': () => [200, RESCUE],
      'GET /ingredients': () => [200, INVENTORY],
      'DELETE /ingredients/5': () => [204],
    });
    renderApp('/');
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: /^양파,/ }))[0]);
    await user.click(screen.getByRole('button', { name: '재료 삭제' }));
    await user.click(await screen.findByRole('button', { name: '삭제하기' }));
    expect(await screen.findByText('재료를 삭제했어요')).toBeInTheDocument();
    expect(calls.filter((c) => c.key === 'GET /ingredients')).toHaveLength(2);
  });

  it('만료 일괄 삭제: 서버 deleted 개수로 안내', async () => {
    mockApi({
      'GET /rescue': () => [200, RESCUE],
      'GET /ingredients': () => [200, INVENTORY],
      'DELETE /ingredients/expired': () => [200, EXPIRED_DELETED_ONE],
    });
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /만료 재료 일괄 삭제/ }));
    await user.click(await screen.findByRole('button', { name: '삭제하기' }));
    expect(await screen.findByText('만료 재료 1개를 삭제했어요')).toBeInTheDocument();
  });

  it('PATCH 실패 시 시트와 입력을 유지', async () => {
    mockApi({
      'GET /rescue': () => [200, RESCUE],
      'GET /ingredients': () => [200, INVENTORY],
      'PATCH /ingredients/5': () => [500, SERVER_ERROR],
    });
    renderApp('/');
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: /^양파,/ }))[0]);
    const dialog = await screen.findByRole('dialog', { name: '양파' });
    const date = within(dialog).getByLabelText(/유통기한/);
    await user.clear(date);
    await user.type(date, '2026-10-30');
    await user.click(within(dialog).getByRole('button', { name: '변경 저장' }));
    expect(await within(dialog).findByText('유통기한을 변경하지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument();
    expect(date).toHaveValue('2026-10-30');
  });

  it('PATCH 404(그새 지워진 재료): 시트를 닫고 안내, 목록 재조회', async () => {
    const calls = mockApi({
      'GET /rescue': () => [200, RESCUE],
      'GET /ingredients': () => [200, INVENTORY],
      'PATCH /ingredients/5': () => [404, NOT_FOUND],
    });
    renderApp('/');
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: /^양파,/ }))[0]);
    const dialog = await screen.findByRole('dialog', { name: '양파' });
    const date = within(dialog).getByLabelText(/유통기한/);
    await user.clear(date);
    await user.type(date, '2026-10-30');
    await user.click(within(dialog).getByRole('button', { name: '변경 저장' }));
    expect(await screen.findByText('이미 삭제된 재료예요')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls.filter((c) => c.key === 'GET /ingredients')).toHaveLength(2);
  });

  it('PATCH 400이면 날짜 확인 문구(서버 문구 아님), 입력 유지', async () => {
    mockApi({
      'GET /rescue': () => [200, RESCUE],
      'GET /ingredients': () => [200, INVENTORY],
      'PATCH /ingredients/5': () => [400, INVALID_INPUT],
    });
    renderApp('/');
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: /^양파,/ }))[0]);
    const dialog = await screen.findByRole('dialog', { name: '양파' });
    const date = within(dialog).getByLabelText(/유통기한/);
    await user.clear(date);
    await user.type(date, '2026-10-30');
    await user.click(within(dialog).getByRole('button', { name: '변경 저장' }));
    expect(await within(dialog).findByText('유통기한을 다시 확인해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText('SERVER-MESSAGE-SHOULD-NOT-SHOW')).not.toBeInTheDocument();
    expect(date).toHaveValue('2026-10-30');
  });

  it('DELETE 404(이미 지워진 재료): 오류 대신 안내하고 시트를 닫은 뒤 재조회', async () => {
    const calls = mockApi({
      'GET /rescue': () => [200, RESCUE],
      'GET /ingredients': () => [200, INVENTORY],
      'DELETE /ingredients/5': () => [404, NOT_FOUND],
    });
    renderApp('/');
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: /^양파,/ }))[0]);
    await user.click(screen.getByRole('button', { name: '재료 삭제' }));
    await user.click(await screen.findByRole('button', { name: '삭제하기' }));
    expect(await screen.findByText('이미 삭제된 재료예요')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(calls.filter((c) => c.key === 'GET /ingredients')).toHaveLength(2);
  });

  it('목록을 불러오다 연결이 끊기면 연결 확인 문구(영역마다)', async () => {
    mockApi({
      'GET /rescue': () => [200, RESCUE],
      'GET /ingredients': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    renderApp('/');
    expect(await screen.findByText('인터넷 연결을 확인하고 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText('냉장고 목록을 불러오지 못했어요.')).not.toBeInTheDocument();
  });

  it('ESC로 시트를 닫으면 요청 없이 닫힌다', async () => {
    const calls = mockApi({ 'GET /rescue': () => [200, RESCUE], 'GET /ingredients': () => [200, INVENTORY] });
    renderApp('/');
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: /^양파,/ }))[0]);
    await screen.findByRole('dialog', { name: '양파' });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(calls.filter((c) => !c.key.startsWith('GET'))).toHaveLength(0);
  });
});
