# kotlin-board

Kotlin + Spring Boot + Vue 3로 게시판을 공부하기 위한 멀티 모듈 샘플 프로젝트입니다.

단순 CRUD 게시판에서 끝내지 않고, 실제 게시판 서비스에서 자주 만나는 검색/랭킹/추천/채팅 흐름을 함께 공부할 수 있게 구성했습니다. 코드에는 "왜 이렇게 나누었는지"를 따라갈 수 있도록 주석을 비교적 자세히 남겨 두었습니다.

## 기능별 PR과 학습 기록

디시인사이드·에펨코리아 등의 게시판 흐름을 참고해 기능을 하나씩 PR로 개발합니다. 각 PR은 요구사항, 핵심 개념, 구현 이유와 순서, 코드 읽는 법, 검증 결과를 함께 남깁니다.

- [학습 가이드와 다음 PR 후보](docs/STUDY_GUIDE.md)
- [첫 기록: 기능별 PR과 학습 기록](docs/study/0001-development-workflow.md)
- [작업 규칙](AGENTS.md) · [PR 양식](.github/pull_request_template.md)

## 기술 스택

| 영역 | 스택 |
| --- | --- |
| Backend | Spring Boot 4.1.1, Kotlin 2.4.20, Java 27 (컴파일 대상 JVM 26) |
| Frontend | Vue 3.5.43, TypeScript 7.0.2, Vite 8.3.2 |
| Package Manager | pnpm 12.8.1 |
| Database | H2(local default), MySQL(prod profile) |
| Search | Spring Data Elasticsearch |
| Ranking | Redis ZSET |
| Chat | Spring WebSocket/STOMP, MongoDB |
| Build/Test | Gradle 9.8.0, Vitest 5.0.3, vue-tsc, Vite |

TypeScript 7 native로 일반 TypeScript 코드를 검사하고, Vue 템플릿과 ESLint는 최신 공식 `@typescript/typescript6` 호환 패키지의 API를 함께 사용합니다. 실행 버전과 선택 이유는 [최신 프론트 도구 학습 기록](docs/study/0006-latest-frontend.md)에 정리했습니다.

## 모듈 구성

```text
board
├── board-api                  # 게시글, 댓글, 검색, 랭킹, 채팅 REST/WebSocket API
├── board-entity               # JPA entity, Mongo document, repository
├── board-support              # 공통 지원 모듈
└── board-front
    ├── board-front-api        # 프론트 보조 API, S3 이미지 업로드
    └── board-front-ui         # Vue 3 + TypeScript + Vite UI
```

## 주요 기능

- 게시글 목록, 상세, 작성, 댓글, 추천, 숨김/복구
- 게시판 하단 페이지네이션 UI
- Markdown 기반 글 작성과 이미지 URL 삽입
- Elasticsearch 기반 게시글 검색
- 검색 결과의 점수 신호와 공식 설명 표시
- 관련 글 추천
- Redis 기반 실시간 검색어 랭킹과 검색어 추천
- 채팅방 목록, 생성, 입장/퇴장, STOMP 메시지 송수신 UI
- Vite 단독 실행용 local fixture API

## 사전 준비

필수 도구:

- JDK 27 (`JAVA_HOME`을 설치 경로로 설정)
- Node.js 26.10.0
- pnpm 12.8.1

선택 인프라:

- Elasticsearch: 실제 검색 API 실행 시 필요
- Redis: 실시간 검색어 랭킹 실행 시 필요
- MongoDB: 채팅방 저장 실행 시 필요
- MySQL: `prod` profile 실행 시 필요

현재 저장소에는 `docker-compose.yml`이 포함되어 있지 않습니다. 처음 실행하는 개발자는 프론트 단독 모드로 화면을 먼저 확인하고, 실제 백엔드 연동은 필요한 인프라를 직접 띄운 뒤 진행하는 것을 권장합니다.

## 빠른 시작: 프론트 단독 학습 모드

백엔드와 외부 인프라 없이 게시판 화면, 검색 결과, 실시간 검색어 영역, 채팅방 목록을 확인하는 모드입니다.

```bash
git clone https://github.com/DolphaGo/board.git
cd board

pnpm --dir board-front/board-front-ui install --frozen-lockfile
pnpm --dir board-front/board-front-ui dev
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:3000
```

이 모드에서는 `board-front-ui/vite.config.ts`의 local fixture가 `/api/posts`, `/api/search/posts`, `/api/search/rankings`, `/api/chat/rooms` 요청에 응답합니다.

학습 포인트:

- 프론트 화면 흐름을 백엔드 없이 빠르게 확인할 수 있습니다.
- 검색 점수 설명 UI와 관련 글 추천 UI를 fixture 데이터로 볼 수 있습니다.
- 채팅 REST 목록은 볼 수 있지만, 실제 WebSocket/STOMP 메시지 송수신은 백엔드가 필요합니다.

## 백엔드 실행

JDK 27을 설치하고 `JAVA_HOME`을 해당 설치 경로로 설정합니다. 다음 명령에서 Java 버전과 Gradle의 Launcher/Daemon JVM이 27인지 확인합니다. Gradle은 별도 설치 없이 wrapper가 9.8.0을 내려받고 checksum을 검증합니다.

```bash
java -version
./gradlew --version
```

최신 Kotlin 2.4.20은 JVM 26까지 출력하므로 실행·컴파일 JDK는 27, Java/Kotlin 컴파일 대상은 26입니다. 공식 지원 범위와 실제 검증 결과는 [최신 백엔드 학습 기록](docs/study/0007-latest-backend.md)에 정리했습니다.

기본 profile은 H2 메모리 DB를 사용합니다. 다만 검색, 랭킹, 채팅 저장 기능은 각각 Elasticsearch, Redis, MongoDB 연결이 필요합니다.

```bash
./gradlew :board-api:bootRun
```

기본 API 주소:

```text
http://localhost:8080
```

주요 API:

| 기능 | 경로 |
| --- | --- |
| 게시글 목록 | `GET /api/posts` |
| 게시글 작성 | `POST /api/posts` |
| 게시글 검색 | `GET /api/search/posts?keyword=...` |
| 관련 글 추천 | `GET /api/search/posts/{postId}/related` |
| 실시간 검색어 | `GET /api/search/rankings` |
| 검색어 기록 | `POST /api/search/rankings` |
| 채팅방 목록 | `GET /api/chat/rooms` |
| WebSocket | `ws://localhost:8080/ws` |

## 기본 게시판: 실제 H2/API 학습 모드

두 터미널에서 실행합니다. JDK 27을 사용합니다.

```bash
./gradlew :board-api:bootRun --args='--spring.profiles.active=study'
```

```bash
pnpm --dir board-front/board-front-ui dev:api
```

`http://localhost:3000`에서 실제 DB의 공지와 일반 글 13개를 읽습니다. 목록의 `?page=2`는 화면의 2페이지이며, API에는 `page=1`로 전달됩니다. 새로고침·뒤로가기로도 해당 페이지를 읽을 수 있습니다.

- `dev`: 기존 프론트 단독 fixture 모드입니다. 응답을 DB에 저장하지 않습니다.
- `dev:api`: fixture를 끄고 `/api`를 Spring 서버로 전달합니다. 기본 주소는 `http://localhost:8080`이며, 포트가 다르면 `BOARD_API_URL=http://localhost:18080 pnpm --dir board-front/board-front-ui dev:api`처럼 지정합니다.
- `study`: 전용 H2 메모리 DB와 학습용 관리자(1번)·회원(2번), 공지 1개·일반 글 12개·숨김 글 1개를 준비합니다. 서버를 종료하면 이 프로필의 데이터는 사라집니다. 실제 로그인은 아직 연결하지 않았습니다.
- 검색·랭킹·채팅은 각각 Elasticsearch·Redis·MongoDB가 필요합니다. `dev:api`는 이 API도 실제 서버로 전달하므로 인프라 없이 실행하면 해당 영역은 실패할 수 있습니다.
- 현재 글쓰기는 검색 색인도 함께 실행합니다. 외부 Elasticsearch 없이 저장하는 학습 흐름은 후속 글쓰기 PR에서 다룹니다.

설계·개념·검증은 [게시글 목록 학습 기록](docs/study/0002-post-list.md)을 참고하세요. 일반 백엔드와 연결할 때도 `dev:api`를 사용하며, 해당 환경의 DB 데이터와 외부 인프라는 별도로 준비합니다.

## 프론트 보조 API: 이미지 업로드

`board-front-api`는 S3 이미지 업로드 API를 포함합니다.

```bash
AWS_ACCESS_KEY_ID=... \
AWS_SECRET_ACCESS_KEY=... \
AWS_S3_BUCKET_NAME=... \
./gradlew :board-front:board-front-api:bootRun
```

기본 포트:

```text
http://localhost:18082
```

이미지 업로드 경로:

```text
POST /api/v1/images/upload
```

## 테스트와 검증

프론트 단위 테스트:

```bash
pnpm --dir board-front/board-front-ui test
```

프론트 타입 체크와 빌드:

```bash
pnpm --dir board-front/board-front-ui build
```

게시판 API 전체 테스트, 실행 JAR 생성, 프론트 보조 API 컴파일(JDK 27):

```bash
./gradlew :board-api:test :board-api:bootJar :board-front:board-front-api:compileKotlin
```

공백/패치 오류 확인:

```bash
git diff --check
```

## 검색/랭킹 학습 포인트

검색은 Spring Data Elasticsearch를 사용합니다. 기본 BM25 계열 점수에 더해, 서비스 코드에서 검색 필드별 중요도와 게시판 서비스에 맞는 점수 신호를 함께 다룹니다.

프론트 검색 결과 화면은 단순히 제목/본문만 보여주지 않고, 다음 정보를 함께 보여줍니다.

- 어떤 필드가 매칭되었는지
- 어떤 점수 신호가 적용되었는지
- 관련 글 추천이 어떤 기준으로 계산되었는지
- 검색어가 실시간 랭킹에 어떻게 기록되는지

실시간 검색어는 Redis ZSET으로 누적 점수를 관리합니다. 검색어 추천은 랭킹 데이터를 기반으로 prefix를 좁혀서 보여주는 방식입니다.

## 개발 순서 추천

처음 프로젝트를 보는 경우 아래 순서를 권장합니다.

1. `board-front-ui`를 fixture 모드로 실행해서 화면 구조를 확인합니다.
2. `PostList.vue`, `PostEditor.vue`, `SearchResults.vue`, `SearchRanking.vue`, `ChatRoom.vue`를 읽습니다.
3. `board-api`의 `PostController`, `PostSearchController`, `SearchRankingController`, `ChatRoomController`를 읽습니다.
4. Elasticsearch, Redis, MongoDB를 준비한 뒤 `board-api`를 실행합니다.
5. `dev:api` 모드로 실제 API 연동을 확인합니다.
6. 테스트 명령을 돌려 변경 사항을 검증합니다.

## 현재 남은 개선 과제

- `docker-compose.yml` 추가로 Elasticsearch/Redis/MongoDB 개발 환경 고정
- 실제 Elasticsearch 인덱스 설정과 analyzer 튜닝 문서화
- WebSocket 채팅의 실제 백엔드 smoke test 문서화
- GitHub Dependabot 보안 경고 별도 점검
