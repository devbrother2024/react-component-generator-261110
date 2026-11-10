import { useState, useCallback, useEffect } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import {
  addPromptToHistory,
  loadComponents,
  loadHistory,
  saveComponents,
  saveHistory,
} from '../utils/storage';
import { readGenerateStream } from '../utils/generateStream';

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  /** 생성 중인 컴포넌트. 코드가 스트리밍으로 채워진다. */
  streamingComponent: GeneratedComponent | null;
  history: string[];
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>(loadComponents);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingComponent, setStreamingComponent] = useState<GeneratedComponent | null>(null);

  useEffect(() => {
    saveComponents(components);
  }, [components]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    const draft: GeneratedComponent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      prompt,
      code: '',
      createdAt: new Date(),
    };
    setStreamingComponent(draft);

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate component');
      }

      const code = await readGenerateStream(res.body, (partial) => {
        setStreamingComponent((prev) => (prev ? { ...prev, code: partial } : prev));
      });

      setComponents((prev) => [{ ...draft, code }, ...prev]);
      setHistory((prev) => addPromptToHistory(prev, prompt));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setStreamingComponent(null);
      setIsLoading(false);
    }
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, []);

  return {
    components,
    streamingComponent,
    history,
    isLoading,
    error,
    generate,
    removeComponent,
    clearAll,
  };
}
