# 0008. 검색어 랭킹의 실제 최근 30분 집계

- 상태: PR 공개, 로컬 검증·독립 리뷰 완료, CI 확인 중
- PR: [#20](https://github.com/DolphaGo/board/pull/20)
- 이슈: [#19](https://github.com/DolphaGo/board/issues/19)
- 선행 PR: [#16](https://github.com/DolphaGo/board/pull/16)
- 검증 기준: `(현재 시각 - 30분, 현재 시각]`에 들어온 검색 횟수

## 문제와 완료 조건

기존 live ZSET은 새 검색마다 키 전체의 TTL을 연장한다. TTL은 키의 만료 시점이므로 기록 각각의 나이를 알 수 없다. 검색이 이어지면 30분 밖의 검색도 남는데 응답은 최근 30분 횟수라고 설명했다.

1. 검색 시각별 이벤트를 남겨 시간창 밖의 검색 횟수를 제외한다.
2. 새 검색이 없더라도 순위 조회 시 오래된 이벤트를 정리한다.
3. 같은 검색어의 반복·동시 입력을 잃지 않는다.
4. 자동완성용 누적 점수와 유입 경로 집계는 유지한다.
5. 실제 최신 Redis에서 Lua·시간 경계·병렬 기록을 확인한다.

## 구현 순서

- 실제 Redis에 오래된 이벤트를 준비해 기존 구현의 실패를 재현한다.
- 두 live ZSET(시간 이벤트·키워드 횟수)을 Lua로 함께 갱신한다. 서버 TIME과 이벤트별 UUID를 사용한다.
- 기존 단위 테스트와 UI 설명을 새 동작에 맞추고, CI에 Redis 8.10.2를 준비한다.
- 전체 검증과 실제 API·화면 확인 후 개념·코드·실패·결과를 채운다.

## 전환 범위

기존 live 점수에는 기록 시각이 없어 정확한 시간창으로 복원할 수 없다. 새 버전 live 키를 사용하며 초기 순위가 비어 있을 수 있다. 누적/source 키는 유지한다. TTL은 유휴 키 정리용이고, 정확한 시간창 계산은 이벤트 정리가 담당한다.

## 개념과 코드 읽기

**TTL과 시간창**: TTL은 키 전체의 만료 시각이다. 검색마다 30분을 다시 설정하면 ‘마지막 검색 이후 30분’ 동안 키가 유지될 뿐 개별 검색이 최근 30분 안인지 알 수 없다. 정확한 집계는 각 이벤트의 시각이 필요하다.

**두 ZSET의 역할**: live 이벤트 ZSET의 score는 밀리초 시각이고 member는 `UUID:검색어`다. live 순위 ZSET의 score는 해당 검색어의 횟수다. 오래된 이벤트 하나를 제거할 때 순위에서 1을 빼고 0이면 검색어도 제거한다. UUID는 같은 검색어의 반복 입력이 동일 member를 덮어쓰지 않도록 구분한다. 구분 문자는 첫 콜론만 해석해 검색어 자체의 콜론도 보존한다.

**원자성과 서버 시각**: [Lua 스크립트](../../board-api/src/main/resources/redis/live-search-ranking.lua)는 Redis `TIME`으로 현재 시각을 구하고 기록·차감·정리·순위 읽기를 수행한다. API 프로세스의 서로 다른 시계가 시간창 계산에 섞이지 않는다. Lua 실행 중 다른 클라이언트의 명령이 끼어들지 않는 원자성으로 두 live ZSET의 일관성을 유지한다. 이것은 SQL 트랜잭션처럼 모든 실행 오류를 rollback한다는 의미는 아니다. [Redis Lua 공식 문서](https://redis.io/docs/latest/develop/programmability/eval-intro/), [TIME](https://redis.io/docs/latest/commands/time/)

**KEYS와 ARGV**: 키 이름은 KEYS, 동작·검색어·UUID·기간·순위 끝 인덱스는 ARGV로 넘긴다. 입력마다 Lua 본문을 새로 만들지 않고 같은 스크립트를 재사용한다. 두 live 키는 같은 `{live}` hash tag를 써 한 Redis Cluster 슬롯에 배치되도록 설계했다. 검증 환경은 단일 Redis이며 클러스터 배포를 수행한 것은 아니다.

**숫자 범위**: API `limit`은 Long이다. Lua에서 큰 Long을 부동소수로 바꿔 끝 인덱스를 계산하면 Redis 정수 범위를 넘을 수 있다. [SearchRankingService](../../board-api/src/main/kotlin/dev/dolphago/search/SearchRankingService.kt)가 Java Long으로 `limit - 1`을 계산한 문자열을 전달하고, Lua는 이 문자열을 그대로 사용한다.

읽는 순서: [SearchRankingController](../../board-api/src/main/kotlin/dev/dolphago/search/SearchRankingController.kt) → `SearchRankingService` → `live-search-ranking.lua` → [단위 테스트](../../board-api/src/test/kotlin/dev/dolphago/search/SearchRankingServiceTest.kt) → [실제 Redis 테스트](../../board-api/src/test/kotlin/dev/dolphago/search/SearchRankingWindowIntegrationTest.kt). [SearchRanking.vue](../../board-front/board-front-ui/src/components/SearchRanking.vue)는 서버의 횟수를 표시하고 30초 polling 또는 검색 이벤트로 다시 읽는다.

## 검증 기록

검증일: 2026-10-03. Redis 8.10.2, Node 26.10.0, pnpm 12.8.1, JDK 27, Gradle 9.8.0 사용. 프런트 직접 의존성 42개를 재조회해 추가 버전 차이가 없음을 확인했다.

| 검사 | 실제 결과 |
| --- | --- |
| 실제 Redis의 기존 구현 재현 | 시간창·반복·병렬 입력 4개 테스트 실패 → 수정 후 통과 |
| 정확한 30분 경계 | TIME 응답만 고정하고 운영 Lua 본문 및 ZSET은 실제 Redis에서 실행. 30분 경계의 포함 연산을 일부러 바꾸면 실패함을 확인 |
| 큰 Long limit | Lua의 부동소수 변환에서 정수 범위 오류 재현 → Java Long 끝 인덱스로 전달한 뒤 통과 |
| `./gradlew :board-api:test --no-daemon --max-workers=2` | API 108개 통과, 실패·오류·skip 0. 실제 Redis 6개 포함 |
| `pnpm --dir board-front/board-front-ui test` | 프런트 28개 파일·275개 통과 |
| `pnpm build`, `pnpm lint` | 타입 검사·Vite 빌드 통과, lint 오류 0·경고 494 |
| 두 실행 JAR 빌드 | API·프런트 API bootJar 통과 |
| 독립 코드 리뷰 | 구현·실제 Redis 테스트·시간 경계·동시 기록을 검토했고 중대한 결함 없음 |
| 실제 HTTP + Redis | 기록 중 만료 제거, 조회만 할 때 만료 제거, 누적 점수 보존, 정규화된 횟수와 source 집계 확인 |
| 실제 API + 1440×1000 / 390×844 브라우저 | `redis study` 2회·`kotlin window` 1회 표시, 검색어 버튼 너비 64px, 가로 넘침 없음 |

일반 시간 테스트는 서버 시각 기준 31분·29분 이벤트를 준비한다. 정확한 경계 테스트만 Redis TIME 응답을 고정하는 테스트용 외부 시계 대역을 사용한다. Lua 본문이나 ZSET 구현을 대역으로 바꾸지 않는다. 병렬 테스트는 4개 스레드에서 20회 기록해 20개 이벤트·20회 점수를 확인한다.

로컬의 설치 Redis는 8.10.1이어서 공식 GitHub 8.10.2 소스를 임시 경로에 빌드했다. CI는 확인된 `redis:8.10.2-alpine` 서비스를 전용 포트 16379에 연결한다. 테스트는 해당 인스턴스에서 이 기능의 네 키를 초기화하므로 기존 사용자·운영 Redis를 연결하지 않는다. 검증은 mock, 실제 Redis, 실제 HTTP, 실제 화면을 구분한다.

## 발견한 문제와 해결

- 기존 키 전체 TTL 연장 방식으로 오래된 점수가 남는 것을 실제 Redis에서 재현했다. 시각별 이벤트를 정리하도록 변경했다.
- 정확히 30분인 이벤트를 포함시키는 잘못된 비교를 경계 테스트가 잡았다. 시간창을 `(now - 30분, now]`로 정했다.
- 큰 Long의 Lua 숫자 변환에서 `ERR value is not an integer or out of range`가 발생했다. 순위 끝 인덱스를 Java에서 계산해 문자열로 전달했다.
- 화면의 점수 설명 칸이 검색어 버튼을 너비 0으로 밀어냈다. 최대 폭만 100px로 제한한 뒤 두 화면 폭에서 실제 표시를 확인했다.

## 한계와 복습

검색 한 번마다 이벤트 하나를 저장하므로 메모리는 최근 검색량에 비례한다. 정리는 오래된 이벤트 수만큼 수행되고 Lua가 Redis를 점유한다. 대규모 트래픽에서는 이 비용을 측정한 뒤 다른 집계 방식의 정확도와 비용을 비교해야 한다.

두 live ZSET의 작업은 원자적이지만 누적/source 기록까지 하나의 트랜잭션으로 묶은 것은 아니다. 이번 변경은 기존 누적/source 경계를 유지한다. 기존 live 키의 시각을 복원할 수 없어 새 live 시간창은 비어 있는 상태로 시작한다.

1. 키 TTL과 이벤트별 시간창은 무엇이 다른가?
2. 점수 ZSET과 시각 ZSET은 각각 무엇을 정렬하는가?
3. 같은 밀리초의 반복 입력을 왜 UUID로 구분하는가?
4. 원자성과 오류 rollback은 어떻게 다른가?
