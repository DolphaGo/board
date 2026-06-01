---
version: alpha
name: DolphaGo Board - Wired Forum
source:
  repository: https://github.com/VoltAgent/awesome-design-md
  baseDesign: design-md/wired/DESIGN.md
  checkedAt: "2026-06-02"
  note: "VoltAgent awesome-design-md의 WIRED 스타일을 게시판 학습용 UI로 변형한다."
colors:
  primary: "#000000"
  on-primary: "#ffffff"
  ink: "#000000"
  ink-soft: "#1a1a1a"
  body: "#5f6368"
  muted: "#757575"
  hairline: "#e0e0e0"
  canvas: "#ffffff"
  canvas-soft: "#f5f5f5"
  row-hover: "#fafafa"
  link: "#057dbc"
  ranking-hot: "#d73a31"
typography:
  display-md:
    fontFamily: Georgia, "Times New Roman", serif
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0
  title:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: 0
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  meta:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  label:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.3px
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px
components:
  board-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    maxWidth: 1180px
  board-row:
    backgroundColor: "{colors.canvas}"
    hoverBackgroundColor: "{colors.row-hover}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm} {spacing.md}"
  board-title-link:
    textColor: "{colors.ink}"
    hoverTextColor: "{colors.link}"
    typography: "{typography.title}"
  meta-row:
    textColor: "{colors.muted}"
    typography: "{typography.meta}"
  ranking-panel:
    backgroundColor: "{colors.canvas-soft}"
    borderColor: "{colors.hairline}"
    typography: "{typography.meta}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm} {spacing.md}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm} {spacing.md}"
---

# DolphaGo Board Design

이 문서는 코프링 게시판 샘플 프로젝트의 기준 디자인 스펙이다. 구현 중 UI 판단이
필요하면 이 파일을 먼저 읽는다. 출처는 사용자가 지정한
[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)이고,
그중 `design-md/wired/DESIGN.md`를 게시판에 맞게 변형했다.

## 출처 확인

- 2026-06-02 확인 기준, `awesome-design-md`는 실제 웹사이트에서 추출한 DESIGN.md
  컬렉션이고, 프로젝트 루트에 DESIGN.md를 두어 AI agent가 UI 일관성을 읽도록 하는
  사용 방식을 안내한다.
- 컬렉션의 WIRED 항목은 흰 종이 같은 고밀도 편집면, serif 중심 제목, ink-blue 링크를
  특징으로 설명된다.
- 이 프로젝트는 루트 파일명을 사용자의 요청에 맞춰 `design.md`로 유지하되, 역할은
  DESIGN.md와 동일한 UI 기준 문서로 본다.

## 왜 WIRED 기반인가

`awesome-design-md`의 WIRED 스펙은 흰 캔버스, 검은 잉크, 얇은 구분선, 제목 중심
story row가 핵심이다. 이 구조는 디시인사이드 같은 전통 게시판의 고밀도 목록과
잘 맞는다. 반대로 `theverge`는 색 블록과 큰 radius가 강해 커뮤니티 게시판보다
매거진 피드에 가깝고, `linear.app`은 다크 SaaS 톤이라 공부용 게시판 기본값으로는
기술 제품처럼 보일 위험이 있다.

## 제품 방향

- Spring Boot 3.4.2, Kotlin 2.1.10, Vue 3, TypeScript, Vite, pnpm 기반의 공부용
  게시판이다.
- 주요 학습 기능은 게시글 CRUD, 채팅, Elasticsearch 검색, 검색어 랭킹, 프론트
  게시판 UI다.
- 코드는 실무 프로젝트처럼 너무 압축하지 않는다. 복잡한 선택에는 "무엇을"보다
  "왜" 그렇게 나누었는지 설명하는 주석을 남긴다.
- 기능 단위로 커밋하고, 각 커밋은 테스트나 빌드로 확인 가능한 상태를 목표로 한다.

## UI 원칙

### 게시글 목록

- 첫 화면은 게시글 목록이 중심이다.
- 제목은 가장 강하게 보여주고, 작성자, 시간, 조회수, 댓글 수, 추천 수는 작게 둔다.
- 카드형 블로그 레이아웃보다 행 단위 테이블형 게시판 레이아웃을 우선한다.
- 행 사이에는 `hairline` 색상으로 1px 구분선을 둔다.
- hover는 그림자나 확대가 아니라 배경색 `row-hover`와 제목 링크 색상 변화만 쓴다.

왜 이렇게 하는가:
게시판은 많은 글을 빠르게 훑는 도구다. 카드 UI는 예쁘지만 반복 스캔에는 공간을
많이 쓴다. WIRED의 `story-row`처럼 제목과 메타 정보를 조밀하게 배열하면 게시판
특유의 탐색 속도를 유지할 수 있다.

### 검색

- 검색창은 상단 헤더에 고정된 주요 기능으로 둔다.
- 검색 결과에는 제목 일치, 본문 일치, 최신성, 조회수 같은 스코어링 힌트를 표시한다.
- 음절/부분 검색은 Elasticsearch analyzer와 ngram 계열 인덱스를 공부하기 위한
  주제로 다룬다.

왜 이렇게 하는가:
검색은 단순 `LIKE` 대체가 아니라 "왜 이 글이 위에 나오는지"를 배우는 기능이다.
따라서 백엔드 점수 계산과 프론트 표시가 함께 설계되어야 한다.

### 실시간 검색 순위

- 데스크톱에서는 우측 사이드바의 `ranking-panel`에 표시한다.
- 모바일에서는 게시글 목록 아래나 접이식 영역으로 내린다.
- MVP에서는 WebSocket이 아니라 주기적 polling API로 시작한다.
- 검색어 기록은 나중에 통계 분석을 공부할 수 있도록 이벤트로 남긴다.

왜 이렇게 하는가:
랭킹은 실시간처럼 보이지만 초 단위 push가 꼭 필요한 기능은 아니다. 처음부터
WebSocket으로 만들면 채팅과 관심사가 섞인다. 랭킹은 polling으로 단순하게 시작하고
WebSocket은 채팅 학습에 집중한다.

### 채팅

- 채팅은 WebSocket/STOMP 학습용 기능으로 유지한다.
- 채팅방 목록, 채팅방 입장, 메시지 송수신을 먼저 완성한다.
- 게시글 검색/랭킹과 채팅은 같은 `board-api` 안에 있어도 패키지를 분리한다.

왜 이렇게 하는가:
검색어 랭킹은 집계와 캐시가 중요하고, 채팅은 연결 상태와 메시지 전달이 중요하다.
둘 다 "실시간"이라는 단어를 쓰지만 학습 포인트가 다르므로 코드 경계를 나눈다.

## 백엔드 구조

### 모듈 책임

- `board-api`
  - 게시글 API, 검색 API, 검색어 랭킹 API, 채팅 API를 제공한다.
  - HTTP/WebSocket 진입점과 애플리케이션 서비스를 둔다.
  - Elasticsearch 문서 모델과 Redis 랭킹 어댑터는 MVP 동안 이 모듈 내부에 둔다.
- `board-entity`
  - MySQL 기준의 source of truth 엔티티를 둔다.
  - `Post`, `Member`, 검색 이벤트처럼 영속 데이터의 원본이 되는 모델을 둔다.
- `board-support`
  - 공통 유틸리티, 공통 설정, 반복 사용되는 작은 도우미를 둔다.
- `board-front-api`
  - Vue 빌드 결과물을 정적 리소스로 제공한다.
  - 기존 이미지 업로드처럼 프론트 서버에 가까운 기능만 유지한다.
- `board-front-ui`
  - Vue 3, TypeScript, Vite, pnpm 기반 UI를 둔다.

왜 이렇게 하는가:
현재 레포에서 실행 애플리케이션은 `board-api`가 자연스럽다. 검색 전용 모듈을 바로
만들면 구조는 깔끔하지만 공부용 MVP에는 비용이 크다. 대신 `board-api.search`
패키지에서 시작하고, 코드가 커지면 `board-search` 모듈로 분리할 수 있게 경계를
명확히 둔다.

### 검색 흐름

1. 사용자가 프론트에서 검색어를 입력한다.
2. `board-api`의 검색 컨트롤러가 요청을 받는다.
3. 검색 서비스가 Elasticsearch에서 게시글 read model을 조회한다.
4. 검색 결과와 스코어링 힌트를 응답한다.
5. 같은 검색어를 검색 이벤트로 기록한다.
6. Redis sorted set에 검색어 점수를 증가시킨다.
7. 랭킹 API는 Redis sorted set에서 상위 검색어를 조회한다.

왜 이렇게 하는가:
검색 결과를 반환하는 일과 랭킹을 집계하는 일은 분리해서 생각해야 한다. 사용자는
검색 결과를 빨리 받아야 하고, 랭킹 기록은 통계/집계 성격이다. 처음에는 같은 요청
안에서 처리하되, 코드 구조는 나중에 이벤트 비동기 처리로 빼기 쉽게 만든다.

### Elasticsearch 방향

- 게시글 원본은 MySQL `Post`가 가진다.
- Elasticsearch에는 검색에 필요한 `postId`, `title`, `content`, `authorNickname`,
  `createdAt`, `viewCount`, `commentCount` 같은 read model을 둔다.
- 제목 필드에는 본문보다 높은 boost를 준다.
- 최신성이나 조회수는 기본 검색 품질을 해치지 않는 범위에서 가중치로 반영한다.
- 한국어 음절/부분 검색은 ngram 계열 필드로 시작하고, 형태소 분석기는 별도
  학습 단계에서 추가한다.

왜 이렇게 하는가:
Elasticsearch 문서는 원본 데이터가 아니라 검색을 위한 복사본이다. 원본과 검색
문서를 분리해 두면 인덱스 매핑을 바꾸거나 재색인할 때 MySQL 데이터 모델을 덜
흔들 수 있다.

## 프론트 구조

- `Header.vue`: 로고, 주요 메뉴, 검색창을 담당한다.
- `PostList.vue`: 고밀도 게시글 목록을 담당한다.
- `SearchRanking.vue`: 실시간 검색 순위를 담당한다.
- `ChatRoomList.vue`, `ChatRoom.vue`: 채팅 기능을 담당한다.
- API 호출은 `src/api` 아래에서 기능별 파일로 나눈다.

왜 이렇게 하는가:
학습용 프로젝트에서는 컴포넌트를 너무 작게 쪼개도 따라가기 어렵다. 화면에서 역할이
명확한 단위로만 나누고, API 파일도 게시글, 검색, 채팅 정도의 기능 단위로 나눈다.

## 주석 기준

- 복잡한 분기, 외부 시스템 연동, 모듈 경계에는 "왜"를 설명한다.
- DTO나 단순 getter처럼 코드만 봐도 이해되는 곳에는 주석을 남기지 않는다.
- Elasticsearch, Redis, WebSocket처럼 공부 포인트가 되는 기술에는 입문자가 다음에
  검색할 키워드를 주석에 포함한다.
- 임시 구현이나 미완성 코드는 주석으로 변명하지 않는다. 대신 작은 TODO를 남기고
  다음 커밋에서 해결한다.

좋은 주석 예:

```kotlin
// 검색 결과는 MySQL이 아니라 Elasticsearch에서 읽는다.
// MySQL Post는 원본 데이터이고, Elasticsearch 문서는 검색 속도와 스코어링을 위한
// read model이기 때문이다. 이 경계를 지키면 나중에 인덱스 매핑을 바꿔도 게시글
// 저장 구조를 크게 흔들지 않아도 된다.
```

나쁜 주석 예:

```kotlin
// title을 반환한다.
```

## 반복 구현 순서

1. `design.md`를 기준 문서로 커밋한다.
2. 현재 채팅 코드의 빌드 실패 지점을 먼저 정리한다.
3. 채팅방 목록/입장/메시지 송수신을 테스트와 함께 완성한다.
4. 게시글 목록 API와 프론트 더미 데이터를 실제 API 호출로 바꾼다.
5. Elasticsearch 의존성과 검색 read model을 추가한다.
6. 검색 API와 검색 결과 UI를 추가한다.
7. 검색 이벤트 기록과 Redis 랭킹 API를 추가한다.
8. 실시간 검색 순위 UI를 추가한다.
9. 디자인 일관성과 반응형 레이아웃을 브라우저에서 확인한다.

각 단계는 기능 단위로 커밋하고, 가능하면 원격 브랜치에 push한다.
