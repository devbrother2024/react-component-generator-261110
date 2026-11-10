import { describe, it, expect } from 'vitest';
import { createNDJSONParser } from './ndjson';

describe('createNDJSONParser', () => {
  it('완성된 줄을 JSON 객체로 파싱한다', () => {
    const feed = createNDJSONParser();
    expect(feed('{"type":"delta","code":"a"}\n')).toEqual([{ type: 'delta', code: 'a' }]);
  });

  it('청크 경계에서 잘린 줄은 다음 청크와 합쳐서 파싱한다', () => {
    const feed = createNDJSONParser();
    expect(feed('{"type":"de')).toEqual([]);
    expect(feed('lta"}\n{"type":"done"}\n')).toEqual([{ type: 'delta' }, { type: 'done' }]);
  });

  it('빈 줄은 무시한다', () => {
    const feed = createNDJSONParser();
    expect(feed('\n{"a":1}\n\n')).toEqual([{ a: 1 }]);
  });
});
