// PreToolUse(Bash) 훅: `git commit` 실행 전에 테스트를 돌리고, 하나라도 실패하면 커밋을 차단한다.
// 차단은 exit code 2 + stderr 메시지로 에이전트에 전달된다.

const input = JSON.parse(await Bun.stdin.text())
const command: string = input?.tool_input?.command ?? ''

// `git commit`, `git -C dir commit`, `a && git commit` 형태를 모두 잡는다.
const isGitCommit = /\bgit\b[^;&|\n]*\bcommit\b/.test(command)
if (!isGitCommit) process.exit(0)

const result = Bun.spawnSync(['bun', 'run', 'test'], {
  cwd: input?.cwd ?? process.cwd(),
  stdout: 'pipe',
  stderr: 'pipe',
})

if (result.exitCode === 0) process.exit(0)

const output = `${result.stdout.toString()}\n${result.stderr.toString()}`
  .trim()
  .split('\n')
  .slice(-40)
  .join('\n')

console.error(`테스트가 실패해 커밋을 차단했습니다. 모든 테스트가 통과한 뒤 다시 커밋하세요.\n\n${output}`)
process.exit(2)
