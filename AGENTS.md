# AGENTS.md

## Operational Commands

- 패키지 관리자는 `bun` 고정. npm/yarn/pnpm 사용 금지 (`bun.lock` 사용).
- 설치: `bun install`
- 개발 서버 (API 3002 + Vite 5173 동시): `bun run dev`
- API 서버만: `bun run server`
- 테스트 전체: `bun run test` (vitest, `src/**` 와 `server/**` 의 `*.test.ts(x)` 대상)
- 단일 파일 테스트: `bunx vitest run server/generator.test.ts`
- 린트: `bun run lint`
- 빌드 + 타입체크: `bun run build` (`tsc -b && vite build`)
- 변경 후 완료 전 `bun run lint`, `bun run test`, `bun run build` 순서로 통과 확인.

## Golden Rules

### Immutable

- API 키는 서버 메모리/요청 본문 밖으로 내보내지 않는다. `/api/config`는 키 존재 여부(boolean)만 반환한다. 근거: `server/index.ts:147-157`.
- `.env`는 커밋 금지 (`.gitignore`에 등록됨). 키를 코드·테스트·로그에 하드코딩하거나 출력하지 않는다.
- Google 호출은 키가 URL 쿼리에 들어간다 (`server/index.ts:99`). 이 URL이나 `fetch` 에러 객체를 `console.log`/응답 본문에 그대로 싣지 않는다.

### Do's & Don'ts

- Do: AI 응답 정규화 로직(코드펜스 제거, `render()` 주입)은 `server/generator.ts`의 순수 함수로만 추가하고 테스트를 같이 작성한다. 근거: `server/generator.ts:1-2`, `server/generator.test.ts`.
- Do: 새 Provider를 추가하면 `src/types/index.ts:1`의 `Provider`, `server/index.ts`의 `ENV_KEYS`/`resolveApiKey`/분기, UI 선택지를 함께 수정한다.
- Don't: `server/generator.ts`, `server/fallback.ts`에 `Bun.*` API나 부수효과를 넣지 않는다. vitest(jsdom)가 이 파일들을 직접 import한다. 근거: `vite.config.ts:20-21`.
- Don't: 생성 코드 미리보기를 `react-live`의 inline 모드로 바꾸지 않는다. `noInline`은 `render(<X />)` 호출을 요구한다. 근거: `src/components/LivePreview.tsx:11`.

### 팀 고유 규칙 (코드 분석 기반)

- **이중 방어 (생성 코드 형식):** "import 금지 / render() 호출 / TypeScript 문법 금지"를 시스템 프롬프트(`server/index.ts:11,12,20`)와 서버 후처리(`stripCodeFences`, `ensureRenderCall`, `server/index.ts:188`) 양쪽에서 막는다. 둘 중 하나만 제거하거나 약화하지 않는다.
- **비대칭 (Provider 처리):** 모델 폴백(`withModelFallback`)과 `MAX_TOKENS` 절단 검출은 Google 경로에만 있다 (`server/index.ts:123,134-136`). Anthropic 경로(`server/index.ts:68-96`)에는 없으므로, 공통 동작을 가정하고 코드를 수정하지 않는다. 동작을 맞추려면 의도를 사용자에게 확인한다.
- **하드 제약 (포트 결합):** Vite 프록시 대상 `localhost:3002`(`vite.config.ts:9`)와 `Bun.serve({ port: 3002 })`(`server/index.ts:139`)는 반드시 함께 바꾼다.
- **하드 제약 (에러 상태 매핑):** HTTP 상태 분기는 에러 메시지 문자열의 `'503'`/`'429'` 포함 여부에 의존한다 (`server/index.ts:194,201`). 업스트림 에러 메시지 형식(`Claude API error: ${status}`, `Gemini API error: ${status}`)을 바꾸면 분기가 깨진다.
- **테스트 경계:** 테스트가 있는 영역은 `server/generator.ts`, `server/fallback.ts`, `src/components/PromptInput.tsx`뿐이다. `server/index.ts`, `src/hooks/useComponentGenerator.ts`, `LivePreview`, `ComponentCard`, `CodeView`는 테스트가 없다. 이 영역을 수정할 때는 로직을 순수 함수로 분리해 테스트하거나, `bun run dev`로 수동 확인 결과를 보고한다.

## Project Context

- 목적: 프롬프트로 React 컴포넌트를 생성하고 실시간 미리보기·코드를 제공하는 웹 앱. (상세는 `README.md`)
- Tech Stack: React 19, TypeScript, Vite, react-live, Bun(API 서버), Vitest, Testing Library, ESLint.

## Standards & References

- 커밋: `<type>: <한국어 요약>` (type: `feat`, `fix`, `refactor`, `chore`). 요약은 한 줄, 마침표 없음. 상세는 `.claude/skills/commit/SKILL.md`.
- 사용자 대상 문자열과 코드 주석은 한국어를 유지한다 (`server/fallback.ts`, `server/index.ts`의 기존 톤 참고).
- Maintenance Policy: 이 파일의 규칙과 코드가 어긋나면 작업을 마치기 전에 AGENTS.md 업데이트를 제안한다.
