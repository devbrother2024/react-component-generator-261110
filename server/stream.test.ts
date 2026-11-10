import { describe, it, expect } from 'vitest';
import { createSSEParser, extractAnthropicDelta, extractGoogleDelta } from './stream';

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
