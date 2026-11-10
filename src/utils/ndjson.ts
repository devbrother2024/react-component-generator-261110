// 서버 스트리밍 응답(줄 단위 JSON)을 청크 단위로 파싱한다.

export function createNDJSONParser(): (chunk: string) => unknown[] {
  let buffer = '';

  return (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    // 마지막 조각은 아직 줄이 끝나지 않았을 수 있으므로 버퍼에 남긴다.
    buffer = lines.pop() ?? '';

    return lines.filter((line) => line.trim() !== '').map((line) => JSON.parse(line));
  };
}
