import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEYS,
  addPromptToHistory,
  loadComponents,
  loadHistory,
  loadProvider,
  saveComponents,
  saveHistory,
  saveProvider,
} from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('Provider 저장', () => {
  it('저장된 값이 없으면 기본값 google을 반환한다', () => {
    expect(loadProvider()).toBe('google');
  });

  it('저장한 Provider를 다시 불러온다', () => {
    saveProvider('anthropic');
    expect(loadProvider()).toBe('anthropic');
  });

  it('알 수 없는 값이 저장되어 있으면 기본값을 반환한다', () => {
    localStorage.setItem(STORAGE_KEYS.provider, 'openai');
    expect(loadProvider()).toBe('google');
  });
});

describe('프롬프트 히스토리', () => {
  it('저장된 값이 없으면 빈 배열을 반환한다', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('저장한 히스토리를 다시 불러온다', () => {
    saveHistory(['a', 'b']);
    expect(loadHistory()).toEqual(['a', 'b']);
  });

  it('JSON이 깨져 있으면 빈 배열을 반환한다', () => {
    localStorage.setItem(STORAGE_KEYS.history, '{broken');
    expect(loadHistory()).toEqual([]);
  });

  it('문자열이 아닌 항목은 걸러낸다', () => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(['a', 1, null]));
    expect(loadHistory()).toEqual(['a']);
  });

  it('새 프롬프트를 맨 앞에 추가한다', () => {
    expect(addPromptToHistory(['a'], 'b')).toEqual(['b', 'a']);
  });

  it('중복 프롬프트는 기존 항목을 지우고 맨 앞으로 올린다', () => {
    expect(addPromptToHistory(['a', 'b'], 'b')).toEqual(['b', 'a']);
  });

  it('최대 20개까지만 유지한다', () => {
    const history = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const next = addPromptToHistory(history, 'new');
    expect(next).toHaveLength(20);
    expect(next[0]).toBe('new');
    expect(next).not.toContain('p19');
  });
});

describe('생성된 컴포넌트 목록', () => {
  const sample = {
    id: '1',
    prompt: '버튼',
    code: 'const A = () => <div />;',
    createdAt: new Date('2026-01-02T03:04:05.000Z'),
  };

  it('저장된 값이 없으면 빈 배열을 반환한다', () => {
    expect(loadComponents()).toEqual([]);
  });

  it('저장 후 불러오면 createdAt이 Date로 복원된다', () => {
    saveComponents([sample]);
    const [loaded] = loadComponents();
    expect(loaded.createdAt).toBeInstanceOf(Date);
    expect(loaded).toEqual(sample);
  });

  it('필수 필드가 없는 항목은 걸러낸다', () => {
    localStorage.setItem(
      STORAGE_KEYS.components,
      JSON.stringify([{ id: 'x' }, { ...sample, createdAt: sample.createdAt.toISOString() }]),
    );
    expect(loadComponents()).toEqual([sample]);
  });

  it('JSON이 깨져 있으면 빈 배열을 반환한다', () => {
    localStorage.setItem(STORAGE_KEYS.components, 'nope');
    expect(loadComponents()).toEqual([]);
  });
});

describe('저장 실패', () => {
  it('localStorage.setItem이 예외를 던져도 저장 함수는 throw하지 않는다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveHistory(['a'])).not.toThrow();
    spy.mockRestore();
  });
});
