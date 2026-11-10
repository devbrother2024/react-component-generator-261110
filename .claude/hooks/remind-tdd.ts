// PreToolUse(Edit|Write) 훅: 프로덕션 코드를 수정하기 전에 .claude/rules/tdd.md 요약을 컨텍스트에 주입한다.
// 차단하지 않고 additionalContext 로 상기시키기만 한다.

const input = JSON.parse(await Bun.stdin.text())
const filePath: string = (input?.tool_input?.file_path ?? '').replace(/\\/g, '/')

const isSourceCode = /\/(src|server)\/.+\.(ts|tsx)$/.test(filePath)
const isTestFile = /\.test\.(ts|tsx)$/.test(filePath)
const isTypeOnly = /\/types\/[^/]+\.ts$/.test(filePath)

// 테스트 파일(RED 단계), 타입 정의, 소스 외 파일(설정·문서)은 TDD 대상이 아니므로 조용히 통과한다.
if (!isSourceCode || isTestFile || isTypeOnly) process.exit(0)

const reminder = `[TDD 리마인더] ${filePath} 는 TDD 적용 대상입니다. .claude/rules/tdd.md 는 Rigid 규칙이며 예외가 없습니다.
1. RED: 이 변경이 요구하는 동작 하나에 대한 실패 테스트를 먼저 작성하고, 실행해서 "기능 미구현" 때문에 실패하는 것을 확인했는가? (문법·import 오류로 인한 실패는 RED가 아님)
2. GREEN: 테스트를 통과시키는 최소한의 코드만 작성한다. 테스트가 요구하지 않는 분기·옵션·추상화는 넣지 않는다(YAGNI).
3. REFACTOR: green 상태에서만 정리하고, 새 동작은 추가하지 않는다.
이 대화에서 아직 RED를 확인하지 않았다면 지금 수정을 멈추고 테스트부터 작성하세요. 테스트보다 먼저 프로덕션 코드를 썼다면 그 코드를 삭제하고 RED부터 다시 시작해야 합니다. "단순해서", "나중에 추가", "프로토타입" 같은 변명은 허용되지 않습니다.
버그 수정이면 버그를 재현하는 실패 테스트가 먼저입니다. 단, server/index.ts 등 테스트 경계 밖 영역은 로직을 순수 함수로 분리해 테스트하거나 bun run dev 수동 확인 결과를 보고하세요.`

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: reminder,
    },
  }),
)
