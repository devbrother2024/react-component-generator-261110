import { describe, it, expect, vi } from 'vitest';
import {
  SafeStreamError,
  createGenerateStream,
  createSSEParser,
  extractAnthropicDelta,
  extractGoogleDelta,
  sanitizeStreamError,
} from './stream';

async function readEvents(stream: ReadableStream<Uint8Array>): Promise<Array<Record<string, string>>> {
  const text = await new Response(stream).text();
  return text
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line));
}

async function* fromChunks(...chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) yield chunk;
}

describe('createGenerateStream', () => {
  it('delta 이벤트는 코드펜스를 제거한 누적 코드를, done 이벤트는 render가 주입된 최종 코드를 보낸다', async () => {
    const events = await readEvents(
      createGenerateStream(fromChunks('```jsx\nconst Box = () => <div />;', '\n```'), () => {}),
    );
    expect(events).toEqual([
      { type: 'delta', code: 'const Box = () => <div />;' },
      { type: 'delta', code: 'const Box = () => <div />;' },
      { type: 'done', code: 'const Box = () => <div />;\n\nrender(<Box />);' },
    ]);
  });

  it('일반 에러는 원문 대신 고정 메시지로 error 이벤트를 보낸다', async () => {
    async function* failing(): AsyncGenerator<string> {
      yield 'x';
      throw new SyntaxError('Unexpected token in JSON at position 3 key=SECRET');
    }
    const events = await readEvents(createGenerateStream(failing(), () => {}));
    const last = events[events.length - 1];
    expect(last.type).toBe('error');
    expect(last.error).not.toContain('SECRET');
  });

  it('SafeStreamError의 메시지는 그대로 error 이벤트로 보낸다', async () => {
    async function* failing(): AsyncGenerator<string> {
      yield 'x';
      throw new SafeStreamError('생성된 코드가 너무 길어 잘렸습니다.');
    }
    const events = await readEvents(createGenerateStream(failing(), () => {}));
    expect(events[events.length - 1]).toEqual({
      type: 'error',
      error: '생성된 코드가 너무 길어 잘렸습니다.',
    });
  });

  it('클라이언트가 취소하면 abort 콜백을 호출하고 이후 delta로 예외를 내지 않는다', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    async function* slow(): AsyncGenerator<string> {
      yield 'a';
      await gate;
      yield 'b';
    }
    const abort = vi.fn();
    const reader = createGenerateStream(slow(), abort).getReader();

    await reader.read();
    await reader.cancel();
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(abort).toHaveBeenCalledTimes(1);
  });
});

describe('sanitizeStreamError', () => {
  it('SafeStreamError의 메시지는 유지한다', () => {
    expect(sanitizeStreamError(new SafeStreamError('안전한 메시지'))).toBe('안전한 메시지');
  });

  it('그 외 에러와 비에러 값은 고정 메시지로 대체한다', () => {
    const fixed = sanitizeStreamError(new Error('secret url'));
    expect(fixed).not.toContain('secret');
    expect(sanitizeStreamError('문자열')).toBe(fixed);
  });
});

describe('createSSEParser', () => {
  it('완성된 data 줄의 페이로드를 반환한다', () => {
    const feed = createSSEParser();
    expect(feed('data: {"a":1}\n\n')).toEqual(['{"a":1}']);
  });

  it('청크 경계에서 잘린 줄은 다음 청크와 합쳐서 처리한다', () => {
    const feed = createSSEParser();
    expect(feed('data: {"a"')).toEqual([]);
    expect(feed(':1}\n\n')).toEqual(['{"a":1}']);
  });

  it('data가 아닌 줄(event, 빈 줄, 주석)은 무시한다', () => {
    const feed = createSSEParser();
    expect(feed('event: ping\n: comment\n\ndata: x\n\n')).toEqual(['x']);
  });

  it('CRLF 줄바꿈도 처리한다', () => {
    const feed = createSSEParser();
    expect(feed('data: x\r\n\r\ndata: y\r\n\r\n')).toEqual(['x', 'y']);
  });
});

describe('extractAnthropicDelta', () => {
  it('text_delta 이벤트의 텍스트를 반환한다', () => {
    const data = JSON.stringify({
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'const A' },
    });
    expect(extractAnthropicDelta(data)).toBe('const A');
  });

  it('텍스트가 없는 이벤트는 빈 문자열을 반환한다', () => {
    expect(extractAnthropicDelta(JSON.stringify({ type: 'message_start' }))).toBe('');
  });

  it('error 이벤트는 SafeStreamError를 던진다', () => {
    const data = JSON.stringify({
      type: 'error',
      error: { type: 'overloaded_error', message: 'Overloaded' },
    });
    expect(() => extractAnthropicDelta(data)).toThrow(SafeStreamError);
  });
});

describe('extractGoogleDelta', () => {
  it('candidate parts의 텍스트를 이어서 반환한다', () => {
    const data = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'ab' }, { text: 'cd' }] } }],
    });
    expect(extractGoogleDelta(data)).toEqual({ text: 'abcd', truncated: false });
  });

  it('finishReason이 MAX_TOKENS이면 truncated를 true로 표시한다', () => {
    const data = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: 'MAX_TOKENS' }],
    });
    expect(extractGoogleDelta(data)).toEqual({ text: 'x', truncated: true });
  });
});
