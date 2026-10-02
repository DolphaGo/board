# 0002. 실제 API로 게시글 목록 읽기

- 상태: PR 공개 (미병합)
- PR: [#10](https://github.com/DolphaGo/board/pull/10)
- 선행 PR: [#9](https://github.com/DolphaGo/board/pull/9)
- 기준: `8d588a8`

## 요구사항과 완료 조건

기본 게시판의 첫 단계는 실제 저장소에서 공지와 일반 글을 읽고 페이지를 이동하는 것이다. 기존 화면은 Vite fixture가 요청을 항상 가로채고, 페이지 상태가 컴포넌트 안에만 있어 새로고침·뒤로가기에 보존되지 않는다.

- 기존 fixture 실행은 유지하고, `dev:api`로 실제 Spring API를 선택한다.
- `study` 프로필에서는 H2에 학습용 관리자·일반 회원과 13개의 공개 글을 준비한다. 프로필을 끄면 데이터를 만들지 않는다.
- URL의 `page`는 1부터, Spring API의 `page`는 0부터 센다. 새로고침·뒤로가기로 같은 목록 페이지를 읽는다.
- 빈 목록과 요청 실패를 구분하고, 실패한 페이지를 다시 요청할 수 있다.
- 늦게 도착한 이전 요청이 현재 페이지를 덮어쓰지 않는다.
- 모바일·데스크톱에서 긴 제목과 페이지 컨트롤이 가로로 넘치지 않는다.

이번 PR에서 글쓰기·상세 개선과 실제 로그인은 진행하지 않는다. 검색·랭킹·채팅은 기존 외부 인프라가 필요한 상태로 구분한다.

## 구현 순서

1. Spring의 기존 부트와 프론트 테스트 기준선을 확인한다.
2. `study` 전용 초기 데이터와 Vite의 실제 API 모드를 추가한다.
3. 목록 URL 상태, 오류 재시도, 응답 순서에 대한 실패 테스트를 먼저 만든다.
4. 기존 목록 코드를 최소 수정하고 관련 테스트·타입 검사·빌드를 실행한다.
5. 실제 H2/API와 브라우저에서 페이지 경계·빈 목록·실패·긴 제목을 확인한다.

## 개념과 선택 이유

**Fixture와 proxy**: fixture는 미리 준비한 응답이고 proxy는 요청을 다른 서버로 전달한다. [vite.config.ts](../../board-front/board-front-ui/vite.config.ts)는 `api` 모드일 때 예시 응답을 끄고 `/api`를 Spring으로 전달한다. 브라우저는 프론트와 같은 origin으로 요청하므로 개발 중 별도 CORS 설정 없이 HTTP 흐름을 따라갈 수 있다. 이 설정은 개발 서버용이며 배포 서버의 라우팅 설정을 대신하지 않는다. [Vite 공식 문서](https://vite.dev/config/server-options#server-proxy)

**Profile과 seed**: profile은 실행 환경별 설정과 bean을 선택하는 수단이고 seed는 기능을 재현할 초기 데이터다. [StudyDataInitializer](../../board-api/src/main/kotlin/dev/dolphago/study/StudyDataInitializer.kt)는 `study & !prod`에서만 빈 저장소에 회원과 글을 넣는다. [application-study.yml](../../board-api/src/main/resources/application-study.yml)의 전용 메모리 DB는 종료 시 사라진다. 실제 로그인을 구현한 것이 아니며, 회원 1/2는 학습 화면의 기존 계약이다. [Spring Boot 공식 문서](https://docs.spring.io/spring-boot/reference/features/profiles.html)

**페이지 상태**: [PostList.vue](../../board-front/board-front-ui/src/components/PostList.vue)는 URL의 `page`를 기준으로 조회한다. 화면 2페이지는 API `page=1`로 변환된다. `push`는 사용자의 이동을 브라우저 이력에 남기고, 데이터 삭제 등으로 범위를 벗어난 페이지를 바로잡을 때는 `replace`로 잘못된 이력을 교체한다. 전체 페이지와 항목 수는 서버 응답을 사용한다. [Vue Router 공식 문서](https://router.vuejs.org/guide/essentials/navigation.html)

**비동기 응답 순서**: 먼저 보낸 요청이 먼저 끝난다는 보장은 없다. 요청마다 번호를 올리고 마지막 번호의 응답만 반영한다. 컴포넌트를 떠나도 이전 응답은 버린다. 요청 자체를 취소하는 구현은 아니므로 서버 작업은 끝날 수 있다. [Vue watcher 공식 문서](https://vuejs.org/guide/essentials/watchers.html)

읽는 순서: `PostList.vue` → [postService.ts](../../board-front/board-front-ui/src/api/postService.ts) → [PostController](../../board-api/src/main/kotlin/dev/dolphago/controller/PostController.kt) → [PostService](../../board-api/src/main/kotlin/dev/dolphago/service/PostService.kt) → [PostRepository](../../board-entity/src/main/kotlin/dev/dolphago/post/repository/PostRepository.kt). 화면 테스트는 [PostList.spec.ts](../../board-front/board-front-ui/src/components/PostList.spec.ts), 실제 HTTP/DB 계약은 [PostListApiIntegrationTest](../../board-api/src/test/kotlin/dev/dolphago/controller/PostListApiIntegrationTest.kt)에서 확인한다.

## 검증과 실패 기록

검증일: 2026-10-03. 기능 기준선은 Java 21, Node 26.8.2였다. 사용자의 추가 요구에 따른 전체 최신 버전 전환은 별도 PR에서 수행하고 재검증한다.

| 환경 | 실행 및 확인 | 결과 |
| --- | --- | --- |
| 프론트 기존 기준선 | `jest --runInBand` | 28개 파일, 247개 통과 |
| 목록 재현 테스트 | 새 URL/재시도/응답 역전/범위 초과 테스트 → 수정 | RED 4개 실패 → 목록 12개 모두 통과 |
| 프론트 전체 | `cd board-front/board-front-ui && ./node_modules/.bin/jest --runInBand` | 28개 파일, 255개 통과 |
| 타입·빌드 | 같은 폴더에서 `./node_modules/.bin/vue-tsc --noEmit`, `./node_modules/.bin/vite build` | 통과 |
| 백엔드 전체 | `JAVA_HOME=<JDK21> ./gradlew :board-api:test --no-daemon --max-workers=2` | 17개 클래스, 96개 통과. 실제 HTTP/H2 목록 테스트 포함 |
| 실제 H2 + Vite proxy | 첫/마지막/범위 밖 페이지 API | 공개 13개, 첫 10개·마지막 3개, 공지 우선, 숨김 제외 |
| 실제 브라우저 | 1440×1000, 390×844; 다음 페이지·새로고침·뒤로가기 | 페이지 유지, 가로 넘침 없음. 모바일은 목록을 사이드바 위에 배치 |
| 브라우저의 제어된 응답 | 목록 요청 500 및 전체 0건 응답을 Playwright route로 주입 | 실패/빈 상태 구분. route 해제 후 재시도로 실제 API 복구 |

마지막 행은 실제 DB를 비운 검증이 아니다. HTTP 통합 테스트의 범위 밖 빈 페이지와 전체 0건 UI도 다른 조건이다. 검색·랭킹의 외부 서비스 오류는 기본 게시판 성공과 별개로 관찰했다.

실행 중 발견한 문제:

1. 디스크 부족으로 Kotlin 캐시 쓰기가 실패했다. 기존 생성 JAR만 정리하고 의존성을 재사용했다. 이후 공간이 확보되어 정상 검증했다.
2. 기존 `springdoc 2.5.0`이 Spring Boot 4에서 사라진 `TypeInformation`을 참조해 부트가 실패했다. 공식 호환표의 3.0.x 계열인 3.0.3으로 맞춘 뒤 실제 서버 기동과 HTTP 통합 테스트를 확인했다. 전체 최신화 요구는 이후 추가됐으므로 3.1.1 등 최신 릴리스 적용은 후속 버전 PR로 이어간다. [springdoc 공식 호환표](https://springdoc.org/#what-is-the-compatibility-matrix-of-springdoc-openapi-with-spring-boot)
3. 기존 페이지 테스트 하나는 1페이지 요청에 4페이지 응답을 반환했다. URL이 기준이 된 계약에 맞춰 실제로 4페이지 URL에서 시작하도록 고쳤다.

## 남은 한계와 복습

- 상세의 ‘목록’ 버튼은 아직 1페이지로 간다. 다음 상세 PR에서 전달받은 페이지를 사용한다. 브라우저 뒤로가기는 이 PR에서 확인했다.
- 로그인, 검색·랭킹·채팅, Elasticsearch 없는 글 저장은 각각 후속 범위다.
- URL과 컴포넌트 중 어느 쪽이 페이지 상태의 기준인지, `push`와 `replace`의 차이, fixture 성공이 DB 검증을 대신할 수 없는 이유를 설명해 본다.
