// /api/generate/stream 응답 본문을 읽어 코드 조각을 전달하고 최종 코드를 반환한다.
import { createNDJSONParser } from './ndjson';

type StreamEvent =
  | { type: 'delta'; code: string }
  | { type: 'done'; code: string }
  | { type: 'error'; error: string };

export async function readGenerateStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (code: string) => void,
): Promise<string> {
  const feed = createNDJSONParser();
  const decoder = new TextDecoder();
  const reader = body.getReader();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    for (const event of feed(decoder.decode(value, { stream: true })) as StreamEvent[]) {
      if (event.type === 'delta') onDelta(event.code);
      else if (event.type === 'done') return event.code;
      else throw new Error(event.error);
    }
  }

  throw new Error('생성이 중간에 끊겼습니다. 다시 시도해주세요.');
}
