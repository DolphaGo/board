# 0006. 프론트엔드 최신 안정 버전과 테스트 도구 이전

- 상태: 구현·로컬 검증 완료, PR 준비
- PR: 준비 중
- 기준 커밋: `ce07a9e` (`feature/board-post-detail`)
- 최초 도구 이전 검증 기준: `92d5447` (`feature/board-post-list`)

## 요구사항과 완료 조건

사용자의 "모든지 최신 버전 무조건" 요구에 따라 프론트 직접 의존성과 실행 도구를 2026-10-03 npm Registry의 최신 안정 릴리스로 맞췄다. 시험판은 제외하고, `latest` 태그가 이전 메이저를 가리키면 안정 버전 전체와 peer dependency를 함께 확인했다.

기존 화면 기능은 유지한다. 직접 의존성 조회, 재현 가능한 lockfile, 기존 28개 파일의 255개 테스트와 상세 기능에서 추가한 11개 테스트, TypeScript·Vue 타입 검사, 프로덕션 빌드가 완료 조건이다. 최신 제품끼리 공식 API가 호환되지 않는 경우 공식 호환 패키지를 사용하고 각 검사의 실제 실행 버전을 구분한다.

## 개념과 선택 이유

### 최신 안정 버전과 npm 태그

npm의 `latest`는 배포자가 관리하는 이름이며 전체 안정 릴리스 중 버전이 가장 높다는 보장은 없다. `v-calendar`의 `latest=2.4.2`는 Vue 2용이고 `next=3.1.2`가 Vue 3용 최신 안정판이다. 숫자로만 된 안정 버전과 peer 조건을 대조해 `3.1.2`를 선택했다. [VCalendar 배포 메타데이터](https://registry.npmjs.org/v-calendar)

직접 의존성을 정확한 버전으로 선언하고 `pnpm-lock.yaml`에 하위 의존성 해석을 기록했다. `packageManager`와 `engines`, 루트 `.node-version`은 실행 기준을 표시한다. 오래된 npm `package-lock.json`은 제거해 pnpm lockfile 한 개를 설치 기준으로 삼는다. 하위 의존성의 모든 메이저 버전을 강제로 덮어쓰는 작업은 아니며 각 패키지가 선언한 호환 범위는 유지한다.

실행 도구는 Node **26.10.0**, pnpm **12.8.1**이다. [Node Current](https://nodejs.org/en/download/current), [pnpm 릴리스](https://github.com/pnpm/pnpm/releases/tag/v12.8.1)

### TypeScript 7과 공식 API 호환 패키지

TypeScript 7은 네이티브 컴파일러이며 기존 JavaScript 컴파일러 API를 제공하지 않는다. 현재 최신 `vue-tsc`와 `typescript-eslint`는 그 API가 필요하다. Microsoft가 안내한 npm alias를 적용해 최신 네이티브 실행기와 최신 호환 패키지를 병행 설치했다. [공식 병행 설치 안내](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)

- `@typescript/native: npm:typescript@7.0.2` → `tsc` 실행기는 **7.0.2**다. 일반 `.ts` 코드와 테스트를 검사한다.
- `typescript: npm:@typescript/typescript6@6.0.2` → 최신 호환 패키지는 TypeScript 6 API를 제공한다. lockfile의 실제 API 구현은 TypeScript **6.0.3**이다.
- `vue-tsc@3.3.12`는 이 alias를 인식하는 공식 코드가 있으므로 Vue 템플릿 검사에 사용한다. ESLint의 TypeScript 파서도 같은 호환 API를 사용한다.
- `typecheck`는 `tsc --noEmit && vue-tsc --noEmit`으로 두 검사를 모두 실행한다. Vue 템플릿을 TypeScript 7로 검사했다는 의미는 아니다. Vue 도구가 새 API를 지원할 때 호환 패키지를 제거할 수 있다.

### Jest에서 Vitest로

테스트 실행기는 테스트를 수집하고 mock·assertion·DOM 환경을 제공한다. 기존 `@vue/vue3-jest@29.2.6`은 Jest 29와 Babel 7을 요구하고, 최신 `ts-jest@29.4.14`도 TypeScript 7 미만을 요구했다. 최신 도구를 쓰면서 Vue 파일을 Vite의 변환 과정으로 검사하기 위해 Vitest로 옮겼다. [Vitest Jest 이전 안내](https://vitest.dev/guide/migration/jest)

`vitest.config.mts`에서 실제 빌드와 같은 최신 `@vitejs/plugin-vue`, `src` 별칭, jsdom, setup 파일과 기존 테스트 패턴을 지정한다. 테스트에서 `jest` 대신 `vi`와 Vitest 타입을 명시적으로 가져온다. `vi.mock`이 import보다 먼저 실행되므로 외부 mock 상태는 `vi.hoisted`로 선언하고, 기본 export mock은 `default` 속성을 반환한다. 생성자 대역은 `new`로 호출 가능한 함수를 사용한다.

기존 assertion과 테스트 선언 수를 유지했다. 테스트 후 `restoreAllMocks`가 실행돼도 다음 테스트의 Storage 대역이 적용되도록 setup의 spy를 `beforeEach`에서 준비한다. 오래된 Jest 변환기·Babel 설정과 해당 직접 의존성은 제거했다. V8 coverage 설정도 기존 소스 범위를 대상으로 제공한다.

### ESLint 10 설정

Flat config는 설정 배열을 JavaScript 파일로 정의하는 현재 형식이다. 기존 `.eslintrc`의 추천 규칙·기존 예외를 `eslint.config.mjs`로 옮기고 실행되지 않던 `standard-with-typescript` 의존을 정리했다. 실제 설정에서 사용하지 않는 `eslint-plugin-import`, `eslint-plugin-node`, `eslint-plugin-promise`를 직접 의존성에서 제거했다. [ESLint 설정 이전](https://eslint.org/docs/latest/use/configure/migration-guide)

기존 `Header`, `Homepage`, `Sidebar` 이름은 multi-word 규칙의 정확한 `ignores`로 보존한다. 새 컴포넌트에는 규칙이 계속 적용된다. `PostEditor.vue`의 문자 집합에서 불필요한 `[` escape 한 개를 제거했으며 정규식의 의미는 같다. 설치되지 않았던 `prettier-eslint` 대신 최신 Prettier와 ESLint를 각각 실행하도록 format과 lint-staged 명령을 교체했다. 기존 스타일 경고를 없애기 위한 전체 파일 재포맷은 하지 않았다.

### pnpm 12와 설치 정책

pnpm 12는 `npm_config_*` 환경변수를 읽지 않는다. `pnpm_config_registry` 또는 `--registry`를 써야 한다. 프로젝트 `pnpm-workspace.yaml`에 공개 Registry를 기록해 사용자 전역 Registry 설정과 무관하게 이 저장소를 재현하도록 했다. 전역 설정은 바꾸지 않았다. [pnpm 이전 안내](https://pnpm.io/migration)

기본 출시 대기 시간은 **1,440분(24시간)**이다. 명시적으로 그 시간을 설정하지 않은 경우 기본 strict 모드는 `false`이며, 요청한 정확한 버전이 아직 24시간이 지나지 않았으면 pnpm이 정확한 버전 예외를 기록한다. 이번 설치에서 pnpm이 생성한 예외와 Registry의 발행 시각은 다음과 같다. [공식 출시 대기 정책](https://pnpm.io/settings/dependency-resolution#minimumreleaseagestrict)

| 정확한 예외 | 발행 시각(UTC) | 필요한 이유 |
| --- | --- | --- |
| `@types/node@26.6.4` | 2026-10-01 22:39:22.769 | 조회 시점 최신 Node 타입 |
| `@vue/language-core@3.3.12` | 2026-10-02 09:27:48.122 | 최신 vue-tsc가 요구하는 정확한 버전 |
| `vue-tsc@3.3.12` | 2026-10-02 09:28:35.300 | 최신 Vue 타입 검사기 |

2026-10-02 17:31 UTC 확인 당시 세 릴리스 모두 24시간 미만이었다. 이 예외는 해당 버전의 출시 대기에만 적용되며 패키지 전체나 앞으로의 버전을 허용하지 않는다. 기존 버전용 불필요한 예외 11개는 제거했다. `trustLockfile`, `trustPolicy`, `minimumReleaseAge`, `strictDepBuilds`, `allowBuilds`를 느슨하게 바꾸지 않았다. 설치 로그에서 공급망 정책 검사가 실행돼 통과했고, 보안 검사 실패를 무시하는 옵션은 사용하지 않았다. 이는 취약점이 없다는 audit 결과를 의미하지 않는다.

## 버전 표

각 기존 직접 의존성은 `https://registry.npmjs.org/<패키지명>`의 전체 버전과 `dist-tags`를 재조회했다. alias 패키지는 실제 대상 이름으로 조회했다. 신규 항목은 변경 후 도구가 직접 사용하는 의존성이다.

| 패키지 | 기존 선언 | 적용 버전/alias |
| --- | --- | --- |
| `@eslint/js` | `신규` | `10.0.1` |
| `@formatjs/cli` | `^6.16.6` | `6.16.32` |
| `@stomp/stompjs` | `^7.3.0` | `7.3.0` |
| `@types/file-saver` | `^2.0.7` | `2.0.7` |
| `@types/node` | `^25.9.1` | `26.6.4` |
| `@types/sockjs-client` | `^1.5.4` | `1.5.4` |
| `@typescript-eslint/eslint-plugin` | `^8.60.1` | `8.71.0` |
| `@typescript-eslint/parser` | `^8.60.1` | `8.71.0` |
| `@typescript/native` | `신규` | `npm:typescript@7.0.2` |
| `@vitejs/plugin-vue` | `^6.0.7` | `6.0.9` |
| `@vitest/coverage-v8` | `신규` | `5.0.3` |
| `@vue/compiler-sfc` | `^3.5.35` | `3.5.43` |
| `@vue/test-utils` | `^2.4.5` | `2.5.1` |
| `axios` | `^1.6.8` | `1.20.0` |
| `cypress` | `^13.7.2` | `16.1.1` |
| `dayjs` | `^1.11.10` | `1.11.23` |
| `esbuild` | `^0.28.0` | `0.28.2` |
| `eslint` | `^9.0.0` | `10.11.0` |
| `eslint-plugin-cypress` | `^6.4.1` | `7.0.2` |
| `eslint-plugin-vue` | `^9.24.1` | `10.11.1` |
| `file-saver` | `^2.0.5` | `2.0.5` |
| `globals` | `신규` | `17.13.0` |
| `husky` | `^9.0.11` | `9.1.7` |
| `jsdom` | `^24.0.0` | `30.1.1` |
| `lint-staged` | `^15.2.2` | `17.6.0` |
| `marked` | `^14.1.3` | `18.0.14` |
| `prettier` | `신규` | `3.9.9` |
| `rollup-plugin-analyzer` | `^4.0.0` | `4.0.0` |
| `sockjs-client` | `^1.6.1` | `1.6.1` |
| `streamsaver` | `^2.0.6` | `2.0.6` |
| `typescript` | `^6.0.3` | `npm:@typescript/typescript6@6.0.2` |
| `v-calendar` | `^3.0.0-alpha.8` | `3.1.2` |
| `v-pagination-3` | `^0.1.7` | `0.1.7` |
| `vite` | `^8.0.16` | `8.3.2` |
| `vitest` | `신규` | `5.0.3` |
| `vue` | `^3.5.35` | `3.5.43` |
| `vue-clipboard3` | `^2.0.0` | `2.0.0` |
| `vue-eslint-parser` | `신규` | `10.4.1` |
| `vue-intl` | `^7.2.9` | `8.1.2` |
| `vue-loaders` | `^4.1.4` | `4.1.4` |
| `vue-router` | `^4.3.0` | `5.3.1` |
| `vue-tsc` | `^3.3.3` | `3.3.12` |

제거한 테스트 도구: `@babel/core`, `@babel/preset-env`, `@vue/vue3-jest`, `babel-jest`, `jest`, `jest-environment-jsdom`, `ts-jest`, `@types/jest`. Jest 최신 30.5.2와 Babel 최신 8.0.6을 낮춰 유지하는 대신 현재 사용하는 Vitest 도구 전체를 최신으로 맞췄다.

## 구현 순서와 코드 읽기

1. [package.json](../../board-front/board-front-ui/package.json): 실행 버전, 최신 의존성, `test`·`typecheck`·`lint`·`build` 명령.
2. [pnpm-workspace.yaml](../../board-front/board-front-ui/pnpm-workspace.yaml): 공개 Registry, 기존 설치 스크립트 허용 목록, 정확한 출시 대기 예외.
3. [vitest.config.mts](../../board-front/board-front-ui/vitest.config.mts), [setup-test.ts](../../board-front/board-front-ui/src/setup-test.ts): 테스트 수집·변환·DOM 대역.
4. [PostDetail.spec.ts](../../board-front/board-front-ui/src/components/PostDetail.spec.ts), [ChatRoom.spec.ts](../../board-front/board-front-ui/src/components/chat/ChatRoom.spec.ts): 호이스팅과 생성자 mock 이전 사례.
5. [eslint.config.mjs](../../board-front/board-front-ui/eslint.config.mjs), [tsconfig.json](../../board-front/board-front-ui/tsconfig.json): 최신 검사 도구 설정.

## 검증

환경은 macOS arm64, Node 26.10.0, pnpm 12.8.1이다. 기존 전역 Node·pnpm 설치를 교체하지 않고 다음 형태로 모든 검증을 실행했다. 현재 작업 경로는 `board-front/board-front-ui`다.

```bash
pnpm_config_registry=https://registry.npmjs.org \
  npm exec --yes --registry=https://registry.npmjs.org \
  --package=node@26.10.0 --package=pnpm@12.8.1 -- pnpm <명령>
```

### 최초 도구 이전 검증: 목록 기능 기준

| 명령 | 실제 결과 |
| --- | --- |
| `pnpm install --registry=https://registry.npmjs.org --no-frozen-lockfile` | 설치 성공, 공급망 정책 검사 통과 |
| `pnpm install --frozen-lockfile` | 종료 코드 0, lockfile 변경 없이 설치 일치 확인 |
| `pnpm peers check` | 종료 코드 0, peer dependency 문제 없음 |
| `pnpm test` | 종료 코드 0, **28개 파일·255개 테스트 통과** |
| `pnpm typecheck` | 종료 코드 0, TypeScript 7 native와 Vue 타입 검사 모두 통과 |
| `pnpm build` | 종료 코드 0, 위 타입 검사와 Vite 8.3.2 빌드 통과, 257개 모듈 변환 |
| `pnpm lint` | 종료 코드 0, **오류 0개·기존 서식/주석 경고 486개** |
| `git diff --check` | 통과 |

독립 diff 검토에서도 테스트 파일 28개와 `expect` 604개가 보존됐고 구현 회귀를 발견하지 못했다. 검토자가 Node 26.8.2에서 별도로 실행한 `vitest run --coverage`도 255개 테스트를 통과했다(lines 88.77%, branches 87.13%). 이 보조 coverage 실행은 위 Node 26.10.0 기준 검증과 실행 환경을 구분한다.

### 상세 기능 통합 검증

최신 도구 이전 커밋을 `ce07a9e` 위로 rebase했다. 충돌은 `PostDetail.spec.ts` 한 곳이었다. 상세 기능의 reactive 경로·query page·자동 unmount·테스트 초기화를 보존하고 Vitest mock 호이스팅으로 옮겼다. 상세 테스트 본문은 Jest/Vitest API 이름 차이를 정규화하면 원본과 같으며 테스트 선언 23개와 assertion 88개를 유지한다. `PostDetail.vue`는 상세 기능 기준 커밋과 동일하다.

Node 26.10.0·pnpm 12.8.1에서 통합 후 각 검증을 한 번 실행했다. `build`가 native TypeScript와 Vue 타입 검사를 함께 실행하므로 같은 타입 검사 명령을 추가 반복하지 않았다.

| 명령 | 통합 후 결과 |
| --- | --- |
| `pnpm test` | 종료 코드 0, **28개 파일·266개 테스트 통과** |
| `pnpm build` | 종료 코드 0, `tsc --noEmit`·`vue-tsc --noEmit`·Vite 빌드 통과, 257개 모듈 변환 |
| `pnpm lint` | 종료 코드 0, **오류 0개·기존 경고 491개** |
| 문서 링크·`git diff --check` | 통과 |

README의 현재 버전과 실행 명령, 학습 가이드의 현재 테스트 명령·기록 목록을 갱신했다. 기존 학습 기록의 검증 당시 도구·명령은 그 시점의 증거이므로 수정하지 않았다.

단위 테스트는 mock/jsdom 환경이며 실제 API·DB·WebSocket 또는 실브라우저 검증과 다르다. 이번 이전 자체의 화면 기능 변경은 정규식의 동등한 표현 한 곳뿐이며 실브라우저 QA는 실행하지 않았다. 상세 기능의 기존 브라우저/API 검증은 [0003 기록](0003-post-detail.md)에 있고, 이후 글쓰기 기능을 추가한 통합 브랜치는 별도로 재검증해야 한다.

## 실패와 해결

- TS 7 단독 설치에서 vue-tsc가 `typescript/lib/tsc`를 찾지 못하고 ESLint 파서가 지원 불가 오류를 냈다. 공식 compatibility alias를 적용한 뒤 두 검사 모두 실행됐다.
- TypeScript 7 검사에서 기존 테스트의 Node 전역 `global` 선언을 찾지 못했다. 테스트 helper 세 파일을 표준 `globalThis`로 바꿨고 native·Vue 검사와 모든 테스트가 통과했다.
- pnpm 설치 완료 전 실행한 스크립트가 자동 의존성 확인을 시작했고, `npm_config_registry`가 무시돼 사용자 전역 Registry로 향했다. 해당 실행을 중단하고 설치를 완료한 후 새 환경변수와 프로젝트 Registry 설정으로 검증했다. 정책 검사를 비활성화하지 않았다.
- 최신 ESLint가 기존 컴포넌트 이름 3개와 정규식 escape 1개를 오류로 보고했다. 기존 이름을 정확한 예외로 보존하고 정규식을 동등하게 수정한 후 오류 0개가 됐다.

## 남은 한계와 복습

- Vue 템플릿·ESLint API는 공식 TypeScript 6 호환 패키지를 사용한다. TypeScript 7 native 검사와 이를 구분해야 한다.
- Vite는 현재 `vite.config.ts`와 fixture가 CommonJS 패키지에서 ESM 문법을 사용한다는 **향후 native config loader 전환 경고**를 낸다. 현재 기본 loader와 빌드는 정상이며 경고를 끄지 않았다.
- ESLint 기존 경고는 최초 도구 이전에서 486개, 상세 기능 통합 후 491개이며 주로 Vue 줄바꿈·속성 순서·trailing comma다. 전체 포맷 변경은 이번 버전 이전 범위를 넘는다.
- 왜 npm `latest` 태그만 보고 메이저 버전을 선택하면 안 되는가?
- TypeScript 7 실행기와 Vue checker가 서로 다른 API 구현을 쓰는 이유는 무엇인가?
- `vi.mock`의 호이스팅과 default export 형식은 Jest 이전에서 왜 중요한가?
