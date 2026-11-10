---
name: create-pr
description: |
  현재 브랜치의 변경사항을 분석해 템플릿에 맞춘 제목·본문으로 GitHub PR을 생성한다.
  "PR 만들어줘", "PR 생성", "풀리퀘스트 올려줘", "create PR", "open a pull request", "/create-pr" 같은 요청에 활성화한다.
  이 프로젝트(react-component-generator)는 한국어 템플릿, 그 외 프로젝트는 영문 템플릿을 사용한다.
context: fork
---

# create-pr: 템플릿 기반 PR 생성

이 스킬은 `context: fork`로 서브 에이전트에서 실행된다. 부모 대화 맥락을 볼 수 없으므로, 필요한 정보는 모두 git/gh 명령으로 직접 수집한다. `$ARGUMENTS`가 있으면 base 브랜치 지정이나 PR 설명 힌트로 해석한다.

## 1. 템플릿 선택

현재 프로젝트가 이 프로젝트인지 판별한다. 아래 중 하나라도 만족하면 **한국어**, 아니면 **영문**이다.

```bash
grep -m1 '"name"' package.json          # "react-component-generator" 인가
git remote get-url origin               # URL에 react-component-generator 가 포함되는가
```

| 판별 결과 | 템플릿 | PR 제목/본문 언어 |
|-----------|--------|-------------------|
| 이 프로젝트 | [references/template-ko.md](references/template-ko.md) | 한국어 |
| 그 외 프로젝트 | [references/template-en.md](references/template-en.md) | English |

선택한 템플릿 파일을 읽고 그 구조(섹션 제목·순서)를 그대로 따른다. 섹션을 임의로 추가·삭제하지 않는다.

## 2. 사전 확인

```bash
git rev-parse --is-inside-work-tree
gh auth status
git branch --show-current
git status --short
```

- git 저장소가 아니거나 `gh` 인증이 안 되어 있으면 중단하고 원인을 알린다.
- 현재 브랜치가 기본 브랜치(`main`/`master`)면 PR을 만들 수 없다. 중단하고 브랜치를 먼저 만들라고 알린다. 브랜치를 임의로 만들거나 옮기지 않는다.
- 커밋되지 않은 변경이 있으면 PR에 포함되지 않는다는 점을 최종 보고에 적는다. 직접 커밋하지 않는다.
- 이미 같은 브랜치의 열린 PR이 있는지 확인한다: `gh pr list --head <브랜치> --state open`. 있으면 새로 만들지 않고 해당 URL을 알린다.

## 3. 변경사항 분석

base 브랜치는 `$ARGUMENTS` 지정값, 없으면 `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`로 정한다.

```bash
git fetch origin <base>
git log origin/<base>..HEAD --format='%h %s%n%b'
git diff origin/<base>...HEAD --stat
git diff origin/<base>...HEAD
```

- 커밋이 하나도 없으면 "PR로 올릴 변경이 없습니다"라고 알리고 끝낸다.
- 커밋 메시지가 아니라 **실제 diff**에 있는 내용만 쓴다. 추측으로 의도나 효과를 지어내지 않는다.
- `.env`, 키·토큰이 diff에 보이면 PR 생성을 중단하고 알린다.

## 4. 제목과 본문 작성

- 제목: 70자 이내, 한 줄, 마침표 없음.
  - 한국어 템플릿: 커밋 컨벤션과 같은 `<type>: <한국어 요약>` (type: `feat`, `fix`, `refactor`, `chore`).
  - 영문 템플릿: Conventional Commits 스타일 `<type>: <summary>` (imperative mood).
- 본문: 선택한 템플릿의 각 섹션을 diff 기반으로 채운다.
- 테스트 체크리스트는 **실제로 실행해 확인한 것만** 체크한다. 실행하지 않았으면 체크하지 말고 비워 둔다. 이 프로젝트는 `bun run lint`, `bun run test`, `bun run build` 순서를 기준으로 한다.
- 해당 없는 섹션은 `해당 없음` / `N/A`로 채운다.
- 세션에 PR attribution 지침이 주어져 있으면 본문 맨 끝에 그대로 붙인다.

## 5. 푸시와 PR 생성

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}   # upstream 확인
git push -u origin <브랜치>                              # upstream이 없거나 뒤처진 경우만
gh pr create --base <base> --title "<제목>" --body-file <임시 본문 파일>
```

- 본문은 임시 파일에 써서 `--body-file`로 넘긴다. 셸 따옴표 문제를 피하기 위해서다. 생성 후 임시 파일은 삭제한다.
- `git push --force`는 쓰지 않는다. 푸시가 거부되면 원인을 알리고 중단한다.
- `$ARGUMENTS`에 `--draft`가 있으면 `gh pr create --draft`로 만든다.
- 훅이 실패해도 `--no-verify`로 우회하지 않는다.

## 6. 보고

부모 에이전트에게 아래만 간결히 돌려준다.

- PR URL
- 사용한 템플릿(한국어/영문)과 판별 근거
- base ← head 브랜치
- 제목
- 테스트 체크리스트 중 실행하지 못해 비워 둔 항목, 커밋되지 않은 변경 등 주의사항
