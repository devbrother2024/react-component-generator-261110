import type { GeneratedComponent, Provider } from '../types';

// API 키는 보안 경계상 저장하지 않는다 (src/AGENTS.md).
export const STORAGE_KEYS = {
  provider: 'rcg:provider',
  history: 'rcg:history',
  components: 'rcg:components',
} as const;

const DEFAULT_PROVIDER: Provider = 'google';
const MAX_HISTORY = 20;

function readJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과·접근 차단 시 저장만 건너뛰고 앱은 계속 동작한다.
  }
}

export function loadProvider(): Provider {
  const value = readJSON(STORAGE_KEYS.provider);
  return value === 'anthropic' || value === 'google' ? value : DEFAULT_PROVIDER;
}

export function saveProvider(provider: Provider): void {
  writeJSON(STORAGE_KEYS.provider, provider);
}

export function loadHistory(): string[] {
  const value = readJSON(STORAGE_KEYS.history);
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function saveHistory(history: string[]): void {
  writeJSON(STORAGE_KEYS.history, history);
}

export function addPromptToHistory(history: string[], prompt: string): string[] {
  return [prompt, ...history.filter((p) => p !== prompt)].slice(0, MAX_HISTORY);
}

export function loadComponents(): GeneratedComponent[] {
  const value = readJSON(STORAGE_KEYS.components);
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): GeneratedComponent[] => {
    if (
      typeof item?.id !== 'string' ||
      typeof item.prompt !== 'string' ||
      typeof item.code !== 'string' ||
      typeof item.createdAt !== 'string'
    ) {
      return [];
    }
    const createdAt = new Date(item.createdAt);
    if (Number.isNaN(createdAt.getTime())) return [];
    return [{ id: item.id, prompt: item.prompt, code: item.code, createdAt }];
  });
}

export function saveComponents(components: GeneratedComponent[]): void {
  writeJSON(STORAGE_KEYS.components, components);
}
