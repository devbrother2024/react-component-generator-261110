// 스트리밍 응답(SSE) 파싱·스트림 생성용 순수 함수들. Bun.* 등 부수효과 없음.
import { stripCodeFences, ensureRenderCall } from './generator';

/** 청크 단위로 SSE 텍스트를 받아 완성된 `data:` 줄의 페이로드만 반환한다. */
export function createSSEParser(): (chunk: string) => string[] {
  let buffer = '';

  return (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    // 마지막 조각은 아직 줄이 끝나지 않았을 수 있으므로 버퍼에 남긴다.
    buffer = lines.pop() ?? '';

    return lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trimStart());
  };
}

export function extractAnthropicDelta(data: string): string {
  const event = JSON.parse(data) as {
    type?: string;
    delta?: { type?: string; text?: string };
  };
  if (event.type === 'error') {
    throw new SafeStreamError('Claude 응답 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
  return event.type === 'content_block_delta' && event.delta?.type === 'text_delta'
    ? (event.delta.text ?? '')
    : '';
}

export function extractGoogleDelta(data: string): { text: string; truncated: boolean } {
  const event = JSON.parse(data) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  const candidate = event.candidates?.[0];
  return {
    text: candidate?.content?.parts?.map((part) => part.text ?? '').join('') ?? '',
    truncated: candidate?.finishReason === 'MAX_TOKENS',
  };
}

// 클라이언트에 메시지를 그대로 보여도 안전한 에러. 그 외 에러는 고정 메시지로 대체한다.
export class SafeStreamError extends Error {}

export function sanitizeStreamError(err: unknown): string {
  return err instanceof SafeStreamError
    ? err.message
    : '생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

// 줄 단위 JSON(NDJSON)으로 { type: 'delta' | 'done' | 'error' } 이벤트를 내려준다.
// 클라이언트가 연결을 끊으면 abort를 호출해 업스트림 요청도 취소한다.
export function createGenerateStream(
  deltas: AsyncGenerator<string>,
  abort: () => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        if (!cancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        let text = '';
        for await (const delta of deltas) {
          text += delta;
          send({ type: 'delta', code: stripCodeFences(text) });
        }
        send({ type: 'done', code: ensureRenderCall(stripCodeFences(text)) });
      } catch (err) {
        send({ type: 'error', error: sanitizeStreamError(err) });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      abort();
    },
  });
}
