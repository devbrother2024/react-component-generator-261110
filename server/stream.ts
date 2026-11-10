// 스트리밍 응답(SSE) 파싱용 순수 함수들. 부수효과 없음.

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
