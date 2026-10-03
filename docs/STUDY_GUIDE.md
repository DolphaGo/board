# 기능별 PR로 공부하기

목표는 디시인사이드·에펨코리아 등을 참고한 게시판을 직접 구현하면서, 각 기능이 왜 필요하고 어떻게 동작하는지 코드와 함께 설명하는 것이다. 사용자가 정한 첫 순서는 **목록 → 상세 → 글쓰기**다. 구체적으로 따라 할 화면과 동작은 기능 PR을 시작할 때 정한다.

## 한 PR의 크기

한 PR에는 사용자 행동 하나와 그 행동을 설명하는 코드·테스트·문서를 담는다. 예를 들어 ‘게시글 목록에서 다음 페이지로 이동한다’는 UI, 요청 파라미터, 서버 조회, 응답 DTO를 함께 다뤄도 하나의 기능이다. 로그인·검색·채팅까지 함께 바꾸지는 않는다.

기존 코드가 있는 기능은 다시 만들지 않고, 현재 동작을 재현한 다음 빠진 계약이나 연동을 작은 PR로 완성한다. 기존 구현을 공부하는 기록도 별도 문서 PR로 남길 수 있다.

## 매번 진행하는 순서

1. **요구사항**: 사용자가 하는 행동, 입력/출력, 이번 범위와 완료 조건을 학습 기록에 적는다.
2. **현재 코드 읽기**: 화면 → API 호출 → Controller → Service → 저장소 순서로 따라가고 관련 경로와 심볼을 적는다.
3. **개념과 설계**: 필요한 개념을 쉬운 말로 설명하고, 가장 단순한 구현과 대안의 차이를 적는다. DB/API 변경이 있다면 계약도 적는다.
4. **구현과 검증**: 오류 재현 또는 기능 계약을 확인하는 테스트를 만들고 구현한다. 변경 범위에 맞는 테스트·빌드·화면 확인을 수행한다.
5. **학습 기록 완성**: 실패한 시도, 원인, 해결, 실제 검증 결과, 남은 한계를 갱신한다. 관련 없는 고민을 장황하게 나열하지 않는다.
6. **PR 생성**: 한국어 커밋, PR 양식, 학습 기록 링크를 함께 올린다. 리뷰로 바뀐 코드와 결정은 같은 기록에 반영한다.

작업 전 `git fetch origin --prune`으로 원격 참조를 갱신한다. 2026-10-03 확인 시 기본 브랜치는 `develop`이고 최신 `origin/master`는 `origin/develop`의 조상이다. 현재 PR base는 `develop`, 기능 브랜치 접두사는 `feature/`다. 이후 작업에서도 실제 원격 상태를 다시 확인한다.

## 현재 코드에서 배울 수 있는 개념

아래는 `fb2d441` 기준의 코드 안내다. 코드와 테스트 파일의 존재를 확인한 것이며, 이번 문서 PR에서 애플리케이션 실행이나 테스트 통과를 확인한 표는 아니다. 긴 설명은 해당 기능 PR의 학습 기록에 추가한다.

| 주제 | 개념과 필요한 이유 | 먼저 읽을 코드 |
| --- | --- | --- |
| 요청과 응답 | Controller는 HTTP 입력을 받는 경계, Service는 규칙을 실행하는 계층이다. DTO는 화면과 서버가 주고받을 필드를 정한다. | [PostController](../board-api/src/main/kotlin/dev/dolphago/controller/PostController.kt), [postService.ts](../board-front/board-front-ui/src/api/postService.ts) |
| 게시글 저장 | JPA entity는 관계형 DB에 저장할 객체다. 트랜잭션은 함께 성공하거나 실패해야 하는 DB 작업을 묶는다. | [Post](../board-entity/src/main/kotlin/dev/dolphago/mysql/Post.kt), [PostService](../board-api/src/main/kotlin/dev/dolphago/service/PostService.kt) |
| 목록과 페이지 | `page`와 `size`로 일부 글만 요청한다. 항목과 전체 개수를 함께 응답해야 페이지 이동 UI를 계산할 수 있다. | [PostList](../board-front/board-front-ui/src/components/PostList.vue), [PostRepository](../board-entity/src/main/kotlin/dev/dolphago/post/repository/PostRepository.kt) |
| 글 작성 | 폼 검증은 입력 실수를 잡고, 서버 검증은 API 계약을 지킨다. Markdown은 텍스트에서 HTML을 만들므로 화면 출력 전 허용할 HTML 범위를 정해야 한다. | [PostEditor](../board-front/board-front-ui/src/components/PostEditor.vue), [sanitizeRenderedMarkdown](../board-front/board-front-ui/src/markdown/sanitizeRenderedMarkdown.ts) |
| 댓글·추천·숨김 | 노출 여부와 행위자의 권한은 비즈니스 규칙이다. 원본 레코드를 보존하는 숨김은 실제 삭제와 다르다. | [PostService](../board-api/src/main/kotlin/dev/dolphago/service/PostService.kt), [PostDetail](../board-front/board-front-ui/src/components/PostDetail.vue) |
| 검색 | 검색용 read model은 원본 게시글에서 검색에 필요한 필드를 복사한 것이다. 색인 동기화와 검색 점수는 별도로 이해해야 한다. | [PostSearchIndexService](../board-api/src/main/kotlin/dev/dolphago/search/PostSearchIndexService.kt), [PostSearchService](../board-api/src/main/kotlin/dev/dolphago/search/PostSearchService.kt) |
| 검색어 랭킹 | Redis ZSET은 값마다 점수를 붙여 정렬하는 자료구조다. 검색어 점수 집계와 화면 갱신 주기를 나눠 생각한다. | [SearchRankingService](../board-api/src/main/kotlin/dev/dolphago/search/SearchRankingService.kt), [useSearchRanking](../board-front/board-front-ui/src/components/useSearchRanking.ts) |
| 채팅 | WebSocket은 연결을 유지하며 메시지를 주고받는다. STOMP는 그 연결 위에서 구독 목적지와 메시지 형식을 다룬다. 방 생성 REST API와 메시지 전달은 다른 흐름이다. | [WebSocketConfig](../board-api/src/main/kotlin/dev/dolphago/config/WebSocketConfig.kt), [ChatRoom](../board-front/board-front-ui/src/components/chat/ChatRoom.vue) |
| 테스트와 fixture | fixture는 준비한 예시 응답, mock은 테스트 대상의 의존성을 대신하는 대역이다. 둘 다 실제 인프라 연동을 증명하지 않는다. | [vite.config.ts](../board-front/board-front-ui/vite.config.ts), [PostServiceTest](../board-api/src/test/kotlin/dev/dolphago/service/PostServiceTest.kt), [PostList.spec.ts](../board-front/board-front-ui/src/components/PostList.spec.ts) |

Vite 개발 서버는 일부 API를 fixture로 응답한다. 작성 성공 화면을 보았어도 실제 DB 저장을 확인한 것은 아니다. 채팅 REST fixture도 실제 STOMP 메시지 전달을 대신하지 않는다. 실행 방식과 인프라 요구사항은 [README](../README.md)를 따른다.

## 확정된 다음 PR 순서

2026-10-03 사용자 선택에 따라 기본 게시판을 먼저 완성한다. 각 단계는 기존 구현을 재현하고 부족한 부분을 고치는 별도 PR이다. fixture/실제 API 실행 모드 구분은 해당 기능의 연동 검증에 필요한 선행 작업으로 다루며, 별도 기능 확장으로 키우지 않는다.

| 순서 | 해당 PR에서 배울 것 | 완료 조건 |
| --- | --- | --- |
| 1. 게시글 목록 | 페이지네이션, DTO, 정렬, API 연결 | 실제 응답으로 첫/마지막 페이지, 빈 목록, 공지 순서, 요청 실패를 확인한다. 데스크톱·모바일에서 긴 제목과 페이지 이동을 확인한다. |
| 2. 게시글 상세 | 경로 파라미터, 단건 조회, 조회수, Markdown 출력 | 목록에서 선택한 글의 본문·작성자·메타 정보를 읽는다. 없는 글·조회 실패를 처리하고 목록으로 돌아갈 수 있다. |
| 3. 글쓰기 | 폼 상태, 입력 검증, 트랜잭션, 저장 후 이동 | 제목·본문을 저장하고 상세 및 목록에서 다시 조회한다. 빈 입력·저장 실패·중복 제출을 확인한다. |

기능마다 위 완료 조건을 테스트·실제 연동·화면 확인으로 나눠 학습 기록에 작성한다. 확인하지 못한 조건은 미검증으로 남긴다. 기존의 고정 회원 ID를 쓰는 학습 모드와 실제 로그인은 구분하며, 인증 완성을 이 세 PR에 암묵적으로 포함하지 않는다.

## 기본 게시판 이후 후보

아래는 우선순위와 범위를 아직 확정하지 않은 학습 주제다.

| 후보 | 해당 PR에서 배울 것 | 완료 조건 예시 |
| --- | --- | --- |
| 댓글 또는 추천 동작 완성 | 행위자 식별, 권한, 중복 요청 | 둘 중 한 기능을 골라 정상·거부·반복 요청의 결과를 검증한다. |
| 검색 색인 동기화 검증 | 원본과 read model, 검색 품질 | 선택한 생성/변경 시나리오가 실제 Elasticsearch 결과에 반영된다. |
| 채팅 메시지 전달 검증 | STOMP 구독과 연결 생명주기 | 두 클라이언트가 같은 방에서 송수신하고 다른 방에 메시지가 섞이지 않는다. |

## 학습 기록 양식

`docs/study/NNNN-<topic>.md`를 만든다. `NNNN`은 기록 순번이며 GitHub PR 번호가 아니다. 아래 항목을 복사하되 해당하지 않는 항목은 이유를 적고, 아직 구현하지 않은 내용을 완료형으로 쓰지 않는다.

```markdown
# NNNN. 기능 이름

- 상태: 계획 / 구현 중 / PR 공개 / 병합
- PR: 생성 후 URL 기록
- 기준 커밋:

## 요구사항과 완료 조건
누가 어떤 행동을 하고 어떤 결과를 기대하는가? 이번에 포함하거나 제외한 범위는 무엇인가?

## 개념과 선택 이유
개념의 뜻 → 왜 필요한가 → 이 프로젝트에서 쓰는 위치 → 대안과 한계.
새 개념은 공식 문서 링크를 남기고, 기존 설명은 이전 학습 기록을 연결한다.

## 구현 순서와 코드 읽기
작업 순서, 실제 파일/함수 링크, 요청부터 응답까지의 흐름.
API 입력/출력, 데이터 모델, 권한/실패 조건은 변경한 경우에 적는다.

## 검증
명령 또는 재현 절차 | 환경 | 기대 결과 | 실제 결과.
정상/실패/경계 조건, 미실행 항목과 이유. UI는 해당 화면의 확인 결과도 기록한다.

## 실패와 해결
관찰된 문제 → 원인과 근거 → 바꾼 내용 → 다시 확인한 결과.
실패한 시도가 없으면 없다고 적는다.

## 남은 한계와 복습
이번 범위에 남은 한계, 다음 작은 PR 후보, 스스로 설명해 볼 질문 2~3개.
```

## 검증 명령 선택

- 프론트 로직 변경: `pnpm --dir board-front/board-front-ui test`.
- Vue/TypeScript 변경: `pnpm --dir board-front/board-front-ui build`로 타입 검사와 빌드.
- 백엔드 변경: JDK 27에서 `./gradlew :board-api:test :board-api:bootJar :board-front:board-front-api:compileKotlin` 또는 영향 범위에 맞는 모듈/테스트 선택. 실행 JDK와 JVM 출력 대상의 차이는 [최신 백엔드 기록](study/0007-latest-backend.md)을 참고한다.
- 문서 변경: 로컬 링크와 설명이 실제 코드에 맞는지 확인하고, 새 파일까지 stage한 뒤 `git diff --cached --check`.
- 실제 연동 변경: 위 검사에 더해 필요한 인프라와 API/브라우저 재현 결과를 기록.

현재 [CI](../.github/workflows/ci.yml)는 PR에서 백엔드 테스트·JAR 빌드와 프런트 테스트·lint·타입 검사·빌드를 수행한다. 검증된 `develop` 푸시에서만 Jib 이미지를 게시한다. 브라우저·실제 인프라 검증은 별도로 기록하며, 각 PR의 CI 결과와 직접 실행한 결과를 구분한다.

## 기록 목록

| 기록 | 내용 | PR |
| --- | --- | --- |
| [0001. 기능별 PR과 학습 기록](study/0001-development-workflow.md) | 작업 단위, Git/PR 개념, 기록과 검증 기준 | [#9](https://github.com/DolphaGo/board/pull/9) |
| [0002. 실제 API로 게시글 목록 읽기](study/0002-post-list.md) | H2 학습 데이터, proxy, URL 페이지 상태와 응답 순서 | [#10](https://github.com/DolphaGo/board/pull/10) |
| [0003. 현재 글을 정확히 읽고 목록으로 돌아가기](study/0003-post-detail.md) | 404 계약, 상태 범위, 비동기 응답과 목록 복귀 | [#11](https://github.com/DolphaGo/board/pull/11) |
| [0004. 글을 검증하고 저장한 뒤 다시 읽기](study/0004-post-write.md) | DTO 검증, 긴 본문, 제출 상태, 실제 저장·재조회 | [#16](https://github.com/DolphaGo/board/pull/16) |
| [0005. PR 검증과 이미지 게시 분리](study/0005-pr-ci.md) | CI/CD, 실행 조건, 최신 도구, 러너 통합 검증 | [#17](https://github.com/DolphaGo/board/pull/17) |
| [0006. 프론트엔드 최신 안정 버전과 테스트 도구 이전](study/0006-latest-frontend.md) | 최신 의존성, Vitest, TypeScript 공식 호환 API, 설치 정책 | [#12](https://github.com/DolphaGo/board/pull/12) |
| [0007. 최신 안정 백엔드 버전으로 이행하기](study/0007-latest-backend.md) | Java 27, JVM 26 출력, 최신 의존성, BOM 정렬, 실제 H2/API 검증 | [#13](https://github.com/DolphaGo/board/pull/13) |
