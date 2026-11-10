# server/AGENTS.md

## Module Context

Bun 런타임에서 실행되는 AI API 프록시. 프론트엔드는 Vite 프록시(`/api`)를 통해서만 접근한다. 루트 `AGENTS.md`의 규칙을 전제로 한다.

## Tech Stack & Constraints

- 런타임은 Bun (`Bun.serve`, `process.env`). 외부 HTTP 클라이언트 라이브러리 없이 전역 `fetch`만 사용한다 (`index.ts:69,101`).
- 서버 의존성은 루트 `package.json`을 공유한다. 별도 `package.json`을 만들지 않는다.

## Implementation Patterns

- 새 엔드포인트는 `index.ts`의 `fetch` 핸들러에 `req.method` + `url.pathname` 조건으로 추가한다 (`index.ts:147,159`).
- Provider별 호출 함수는 `callXxx(prompt, apiKey): Promise<string>` 시그니처로 응답 텍스트만 반환한다. 후처리는 호출부에서 `ensureRenderCall(stripCodeFences(text))`로 한다 (`index.ts:188`).
- 모델 우선순위 목록은 `GOOGLE_MODELS` 배열 순서로 관리한다 (`index.ts:5`).

## Testing Strategy

- 테스트는 대상 파일 옆에 `<name>.test.ts`로 둔다 (`generator.test.ts`, `fallback.test.ts`).
- 실행: `bunx vitest run server`
- `index.ts`는 import 시 서버를 띄우므로 테스트에서 import하지 않는다. 테스트하려면 로직을 `generator.ts`/`fallback.ts` 같은 순수 모듈로 분리한다. 근거: `index.ts:138`의 최상위 `Bun.serve`.

## Local Golden Rules

- Do: 모든 `Response`에 `CORS_HEADERS`를 전달한다. 빠뜨린 경로는 브라우저에서 CORS 오류로 보인다. 근거: `index.ts:142,155,172,179,190,197,204,210,217`.
- Do: 새 에러 분기를 추가할 때 메시지에 HTTP 상태 코드 숫자를 포함시킨다. 상태 매핑이 메시지 문자열 검사에 의존한다 (`index.ts:194,201`).
- Don't: `withModelFallback` 안에서 에러를 삼키고 빈 문자열을 반환하지 않는다. 모든 모델이 실패하면 마지막 에러를 던져야 호출부의 상태 코드 매핑이 동작한다 (`fallback.ts:12-19`).
- Don't: 모델 ID(`claude-haiku-4-5-20251001`, `GOOGLE_MODELS`)를 사용자 확인 없이 변경하지 않는다 (`index.ts:5,77`).
