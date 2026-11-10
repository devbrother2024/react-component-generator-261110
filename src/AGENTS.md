# src/AGENTS.md

## Module Context

Vite + React 19 프론트엔드. 서버와는 `/api/generate`, `/api/config` 두 엔드포인트로만 통신한다. 루트 `AGENTS.md`의 규칙을 전제로 한다.

## Tech Stack & Constraints

- `tsconfig.app.json`이 `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`를 켠다. 타입 import는 `import type`으로 쓰고, `enum`/`namespace`/생성자 파라미터 프로퍼티는 쓰지 않는다.
- 스타일은 일반 CSS(`App.css`, `index.css`)와 클래스명만 사용한다. CSS-in-JS, CSS Modules, Tailwind는 도입하지 않는다.
- ESLint `react-refresh` 규칙 때문에 컴포넌트 파일은 컴포넌트만 export한다. 훅·상수·타입은 `hooks/`, `types/`로 분리한다.

## Implementation Patterns

- 컴포넌트는 `components/<PascalCase>.tsx`에 named export, props 인터페이스는 같은 파일 상단에 `<Name>Props`로 선언한다 (`components/ComponentCard.tsx:6-11`). `App`만 default export다.
- 서버 호출과 목록 상태는 `hooks/useComponentGenerator.ts`에 모은다. 컴포넌트에서 `/api/generate`를 직접 `fetch`하지 않는다.
- 공유 타입은 `types/index.ts`에 둔다. `Provider` 유니온이 `App.tsx`의 `PROVIDER_CONFIG` 키와 서버 분기의 기준이다.
- UI는 "창(window) + 타이틀바(titlebar)" 레트로 데스크톱 테마다. 새 패널은 `window` / `titlebar` / `close-box` 클래스 구조를 따른다 (`App.tsx:76-80`). 색상은 `index.css:12-27`의 CSS 변수만 쓰고 hex를 새로 늘리지 않는다.
- 사용자 대상 문구는 한국어다.

## Testing Strategy

- 실행: `bunx vitest run src`
- 테스트는 대상 옆 `<Name>.test.tsx`. 쿼리는 `getByRole`과 접근성 이름을 쓰고, 상호작용은 `userEvent.setup()`을 쓴다 (`components/PromptInput.test.tsx`).
- 테스트 이름은 한국어 문장이다.
- DOM 정리는 `test/setup.ts`의 `afterEach(cleanup)`이 담당한다. 테스트에서 중복 호출하지 않는다.

## Local Golden Rules

- **보안 경계:** 사용자가 입력한 API 키는 `App.tsx`의 React state에만 둔다. 서버로는 요청 본문으로만 보내며 (`hooks/useComponentGenerator.ts:26`), Provider를 바꾸면 비운다 (`App.tsx:43`). `localStorage`, URL, 콘솔 로그로 내보내지 않는다.
- **이중 방어 (빈 프롬프트):** 제출 차단이 버튼 `disabled`(`components/PromptInput.tsx:49`)와 `handleSubmit`의 `trim()` 검사(`:22`) 두 곳에 있다. Ctrl/Cmd+Enter가 버튼을 거치지 않고 `handleSubmit`을 직접 호출하므로 (`:41-43`) 한쪽만 남기지 않는다.
- **하드 제약 (미리보기 새로고침):** 새로고침은 `LivePreview`의 `key={previewKey}` 변경으로 리마운트해서 구현한다 (`components/ComponentCard.tsx:34,73`). `useEffect`로 강제 리렌더하는 방식으로 바꾸지 않는다. 애니메이션 컴포넌트 재시작이 목적이다.
- **비대칭 (재생성):** 재생성은 카드의 프롬프트만 넘기고 (`ComponentCard.tsx:42`) Provider와 키는 `App.handleGenerate`가 현재 선택값으로 채운다 (`App.tsx:33-39`). 카드에 Provider를 저장하도록 바꾸려면 `types/index.ts`의 `GeneratedComponent`부터 수정한다.
- **비대칭 (에러 처리):** `/api/config` 실패는 조용히 무시하고 기본값(키 없음)을 쓴다 (`App.tsx:28`). `/api/generate` 실패는 `error` 상태로 배너에 표시한다 (`hooks/useComponentGenerator.ts:43-46`). 두 경로를 같은 방식으로 통일하지 않는다.
- **테스트 경계:** 테스트는 `PromptInput`에만 있다. `App.tsx`, `useComponentGenerator`, `ComponentCard`, `CodeView`, `LivePreview`는 미테스트 영역이다. 수정 시 `bun run dev`로 직접 확인하거나 테스트를 같이 추가한다.
