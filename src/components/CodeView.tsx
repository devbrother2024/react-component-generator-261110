import { useEffect, useRef, useState } from 'react';

interface CodeViewProps {
  code: string;
  isStreaming?: boolean;
}

export function CodeView({ code, isStreaming = false }: CodeViewProps) {
  const [copied, setCopied] = useState(false);
  const blockRef = useRef<HTMLPreElement>(null);

  // 스트리밍 중에는 새 코드가 보이도록 맨 아래로 스크롤한다.
  useEffect(() => {
    if (isStreaming && blockRef.current) {
      blockRef.current.scrollTop = blockRef.current.scrollHeight;
    }
  }, [code, isStreaming]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-panel">
      <div className="panel-header">
        <button className="btn-copy" onClick={handleCopy} disabled={isStreaming}>
          {copied ? '복사됨!' : '복사'}
        </button>
      </div>
      <pre className="code-block" ref={blockRef}>
        <code>{code || (isStreaming ? '코드를 생성하고 있습니다...' : '')}</code>
      </pre>
    </div>
  );
}
