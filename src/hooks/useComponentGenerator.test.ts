import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../utils/storage';
import { useComponentGenerator } from './useComponentGenerator';

function mockFetchOk(code = 'render(<div />)') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code }) }),
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useComponentGenerator 영속화', () => {
  it('localStorage에 저장된 컴포넌트와 히스토리로 초기화된다', () => {
    localStorage.setItem(
      STORAGE_KEYS.components,
      JSON.stringify([
        { id: '1', prompt: '버튼', code: 'c', createdAt: '2026-01-01T00:00:00.000Z' },
      ]),
    );
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(['버튼']));

    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components).toHaveLength(1);
    expect(result.current.components[0].createdAt).toBeInstanceOf(Date);
    expect(result.current.history).toEqual(['버튼']);
  });

  it('생성에 성공하면 컴포넌트 목록이 localStorage에 저장된다', async () => {
    mockFetchOk('render(<b />)');
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('카드', undefined, 'google'));

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.components) ?? '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ prompt: '카드', code: 'render(<b />)' });
  });

  it('생성에 성공하면 프롬프트가 히스토리 맨 앞에 저장된다', async () => {
    mockFetchOk();
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('첫째', undefined, 'google'));
    await act(() => result.current.generate('둘째', undefined, 'google'));

    await waitFor(() => expect(result.current.history).toEqual(['둘째', '첫째']));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.history) ?? '[]')).toEqual([
      '둘째',
      '첫째',
    ]);
  });

  it('생성에 실패하면 프롬프트를 히스토리에 추가하지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: '실패' }) }),
    );
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('실패 요청', undefined, 'google'));

    expect(result.current.history).toEqual([]);
  });

  it('전체 삭제하면 저장된 컴포넌트 목록도 비워진다', async () => {
    mockFetchOk();
    const { result } = renderHook(() => useComponentGenerator());
    await act(() => result.current.generate('카드', undefined, 'google'));

    act(() => result.current.clearAll());

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.components) ?? 'null')).toEqual([]);
  });
});
