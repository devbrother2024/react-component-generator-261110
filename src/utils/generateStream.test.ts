import { describe, it, expect, vi } from 'vitest';
import { readGenerateStream } from './generateStream';

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe('readGenerateStream', () => {
  it('delta 이벤트마다 onDelta를 호출한다', async () => {
    const onDelta = vi.fn();
    await readGenerateStream(
      makeStream([
        '{"type":"delta","code":"a"}\n{"type":"delta","code":"ab"}\n',
        '{"type":"done","code":"ab"}\n',
      ]),
      onDelta,
    );
    expect(onDelta.mock.calls).toEqual([['a'], ['ab']]);
  });

  it('done 이벤트의 최종 코드를 반환한다', async () => {
    const code = await readGenerateStream(
      makeStream(['{"type":"delta","code":"a"}\n{"type":"done","code":"a\\nrender(<A />);"}\n']),
      () => {},
    );
    expect(code).toBe('a\nrender(<A />);');
  });

  it('error 이벤트를 받으면 해당 메시지로 에러를 던진다', async () => {
    await expect(
      readGenerateStream(makeStream(['{"type":"error","error":"잘렸습니다"}\n']), () => {}),
    ).rejects.toThrow('잘렸습니다');
  });

  it('done 이벤트 없이 스트림이 끝나면 에러를 던진다', async () => {
    await expect(
      readGenerateStream(makeStream(['{"type":"delta","code":"a"}\n']), () => {}),
    ).rejects.toThrow('생성이 중간에 끊겼습니다');
  });
});
