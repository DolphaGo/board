# 0007. 최신 안정 백엔드 버전으로 이행하기

- 상태: PR 공개 (미병합)
- PR: [#13](https://github.com/DolphaGo/board/pull/13)
- 기준 커밋: `92d5447`
- 버전 확인일: 2026-10-03

## 요구사항과 완료 조건

Java, Gradle, Kotlin, Spring Boot와 직접 선언한 백엔드 라이브러리·플러그인을 현재 공개된 최신 안정 버전으로 맞춘다. 미리보기 버전은 제외하며, BOM이 관리하는 모든 전이 의존성을 무차별 덮어쓰지 않는다. 게시판 기능과 UI는 변경하지 않는다.

완료 조건은 Java 27에서 API 테스트, API 실행 JAR 생성, 프론트 보조 API Kotlin 컴파일, 실제 study 프로필 부팅과 HTTP 목록 조회다. 공식 문서의 지원 범위와 이 프로젝트에서 실제 확인한 동작은 구분한다.

## 개념과 선택 이유

- 실행 JDK는 Gradle·테스트·서버를 실행하는 Java이고, JVM target은 컴파일 결과가 요구하는 클래스 파일 버전이다. 두 값을 별도로 확인해야 최신 JDK 사용을 이전 바이트코드와 혼동하지 않는다.
- BOM은 관련 라이브러리 버전을 함께 관리한다. Kotlin·coroutines·Jackson의 명시적 최신화는 각각 한 버전으로 정렬하되, 나머지 전이 의존성은 Boot·Cloud BOM에 맡긴다.
- Gradle wrapper의 배포 checksum은 받은 배포 ZIP이 공식 파일인지 확인한다. wrapper JAR도 공식 SHA-256과 비교한다.
- [Gradle 호환성 표](https://docs.gradle.org/current/userguide/compatibility.html)는 Java 27 실행을 9.8.0부터 지원한다. [Kotlin 표](https://kotlinlang.org/docs/gradle-configure-project.html)의 KGP 2.4.20 완전 지원 상한은 Gradle 9.7.0이다. [Boot 4.1 요구사항](https://docs.spring.io/spring-boot/system-requirements.html)의 Java 상한은 26이다. 사용자가 최신 안정 버전 적용을 명시했으므로 상한을 넘는 부분은 실제 실행 결과와 함께 기록한다.

## 확인한 최신 안정 버전

| 항목 | 이전 | 적용 |
| --- | --- | --- |
| 실행 JDK | 21 | 27+35 |
| Java/Kotlin 출력 대상 | 21 | 26: 최신 Kotlin의 지원 상한 |
| Gradle wrapper | 9.5.1 | 9.8.0 |
| Spring Boot | 4.0.6 | 4.1.1 |
| Kotlin | 2.3.21 | 2.4.20 |
| Spring Cloud | 2025.1.1 | 2025.1.3 |
| springdoc | 3.0.3 | 3.1.1 |
| coroutines | 1.10.1 | 1.11.0 |
| Kover | 0.7.6 | 0.9.11 |
| AWSpring | 3.0.0 | 4.2.0 |
| p6spy starter | 1.9.2 | 2.0.1 |
| MockK | 1.12.3 | 1.14.11 |
| KotlinLogging | microutils 3.0.5 | oshai 8.0.4 |
| MySQL Connector/J | mysql 좌표 8.0.32 | com.mysql 좌표 26.7.0 |
| Jackson Kotlin | Jackson 2 / JSR310 2.13.4 | Jackson 3.2.3 |
| Jib | 3.4.4 | 3.5.4 |
| Sonar | 5.0.0.4638 | 7.5.0.8588 |
| dependency-management / ktlint | 1.1.7 / 14.2.0 | 최신 안정판 그대로 |
| 기존 com.querydsl 좌표 / jnanoid | 5.1.0 / 2.0.0 | 최신 안정판 그대로 |

최신 안정 버전은 [Gradle current API](https://services.gradle.org/versions/current), [Kotlin 릴리스](https://kotlinlang.org/docs/releases.html), [Boot 릴리스](https://github.com/spring-projects/spring-boot/releases/tag/v4.1.1), 각 [Maven Central](https://repo.maven.apache.org/maven2/) 좌표의 `maven-metadata.xml`과 [Gradle Plugin Portal](https://plugins.gradle.org/)을 확인했다. `latest`/`release` 필드가 미리보기를 포함할 수 있으므로 `4.2.0-M2`, `2.5.0-Beta1`처럼 qualifier가 붙은 버전은 제외했다.

Jackson 3은 Java 시간 타입 지원이 내장되어 JSR310 직접 의존성을 제거했다. Swagger 등에서 가져오는 Jackson 2 전이 의존성까지 일괄 제거하지는 않는다. 일반 annotation의 `com.fasterxml.jackson.annotation`은 Jackson 3에서도 사용하는 좌표이므로 유지하고 databind 관련 패키지만 `tools.jackson`으로 변경한다. [Jackson 3 이행 문서](https://github.com/FasterXML/jackson/wiki/Jackson-Release-3.0)

Kover는 `koverReport.defaults` 대신 `kover.reports.total`을 쓴다. 기존 Config/Application/Generated 제외와 최소 커버리지 0 조건을 보존한다. [Kover DSL](https://kotlin.github.io/kotlinx-kover/gradle-plugin/)

Jib은 이전 커스텀 이미지에 종속된 `INHERIT`/`MAIN_CLASS` 대신 `container.mainClass`로 Java 실행 명령을 생성한다. Java 27의 공개 이미지 `amazoncorretto:27.0.0-al2023-headless`를 기본값으로 쓰며 CI의 `FROM_IMAGE`도 같은 태그로 맞춘다. [AWS Corretto 27 Docker](https://docs.aws.amazon.com/corretto/latest/corretto-27-ug/docker-install.html)

## 구현 순서와 코드 읽기

1. `buildSrc/src/main/kotlin/Versions.kt`, `Dependencies.kt`, wrapper를 최신화한다.
2. KotlinLogging/Jackson의 변경된 패키지와 Kover 설정 DSL, Jib의 표준 Java 진입점을 적용한다.
3. Java 27에서 컴파일·테스트·패키징을 실행하고 실패 원인에 해당하는 변경만 추가한다.
4. study 프로필을 실행해 실제 H2/API 응답을 확인한다.

## 검증

환경: macOS 26.6.2 arm64, Eclipse Temurin `27+35`. `JAVA_HOME`을 설치한 JDK 27 경로로 설정하고 아래 명령을 실행했다. `./gradlew --version`의 Launcher JVM과 Daemon JVM도 27로 확인했다. Gradle 자체의 내장 Kotlin은 2.4.10이며 프로젝트 컴파일용 KGP 2.4.20과 구분한다.

| 명령·재현 | 기대 결과 | 실제 결과 |
| --- | --- | --- |
| `./gradlew :board-api:test :board-api:bootJar :board-front:board-front-api:compileKotlin --console=plain` | API 테스트, 패키징, 보조 API 컴파일 | **성공**, 96 tests, failures 0, errors 0, skipped 0. Kover verify도 통과. 전체 테스트 실행 27초. import 정리 후 최종 재확인도 11초에 성공(테스트/JAR는 up-to-date) |
| `./gradlew :board-api:dependencyInsight --configuration runtimeClasspath --dependency jackson-annotations` | Jackson BOM의 annotation 버전 | `jackson-annotations:2.22` 선택 확인 |
| 생성된 `BoardApiApplicationKt.class` 헤더와 JAR 내부 의존성 확인 | JVM 26 출력과 최신 라이브러리 | class major **70**. Kotlin 2.4.20, coroutines 1.11.0, Jackson Kotlin 3.2.3/annotations 2.22, MySQL 26.7.0, logging 8.0.4, p6spy 2.0.1 확인 |
| `java -jar board-api/build/libs/board-api.jar --spring.profiles.active=study --server.port=18087` | JDK 27에서 실제 부팅 | Boot 4.1.1이 **6.104초**에 시작 |
| `/api/posts?page=0&size=10`, `/api/posts?page=1&size=10` | 실제 H2 목록 | HTTP 200, 공개 글 13개, 페이지별 10개/3개 |
| `/api/posts/1` | 상세 조회/JSON 직렬화 | HTTP 200, seed 공지 본문 응답 |
| `/v3/api-docs` | 최신 springdoc 문서 생성 | HTTP 200, OpenAPI 3.1.0, paths 23개 |
| `POST /api/posts` 추가 확인 | JSON 역직렬화 후 저장 | JSON/JPA까지 진행했지만 기존 동기 ES 색인에서 localhost:9200 연결 거부로 HTTP 500. 아래 한계 참고 |
| `git diff --check` | 공백 오류 없음 | 통과 |

wrapper JAR의 SHA-256은 공식 값 `238e777fcddd7e34f9708186085def2abd6e08e658505b38718d79d74c21abd5`와 일치했다. 배포 ZIP checksum `bafd5ce9cfaea0fbccfdc8439a1ac42fbd4cd9c89dc9a988228d8a2639a58e6c`를 `gradle-wrapper.properties`에 넣었고 wrapper가 배포본을 검증하며 실행했다.

검증용 서버는 조회·실패 원인 확인 후 정상 종료했다. 원격 push, PR, 이미지 게시, 배포는 이 작업에서 실행하지 않았다.

## 상세·프론트 변경 통합 검증

상세 기능과 최신 프론트 도구가 포함된 `a3e5198` 위로 백엔드 커밋만 rebase했다. 2026-10-03 같은 JDK 27 환경에서 `./gradlew :board-api:test :board-api:bootJar :board-front:board-front-api:compileKotlin --console=plain`을 한 번 실행했고 **97 tests, failures 0, errors 0, skipped 0**, Kover 검증·JAR 생성·보조 API 컴파일이 모두 통과했다(34초). 프론트 의존성 설치는 실행하지 않았다. 이후 프론트 PR 링크를 추가한 문서 전용 커밋은 기능 코드를 바꾸지 않으므로 코드 테스트를 반복하지 않는다.

## 실패와 해결

1. 첫 빌드는 `Unknown Kotlin JVM target: 27`로 중단됐다. Gradle 9.8.0에 포함된 Kotlin과 KGP 2.4.20의 enum 모두 JVM 26까지만 제공한다. JDK는 27을 유지하고 Java/Kotlin 출력 대상을 26으로 맞췄다. 최신 안정 컴파일러의 출력 한계이며, 실행 JDK를 낮춘 것이 아니다.
2. 첫 전체 테스트는 96개 중 95개 통과, HTTP/H2 목록 통합 테스트 1개가 500으로 실패했다. 실제 실행 JAR에서도 `NoClassDefFoundError: com/fasterxml/jackson/annotation/JsonApplyView`가 재현됐다. Jackson 3.2.3 BOM은 annotations 2.22를 요구하지만 Boot의 Jackson 2 BOM을 거쳐 2.21이 선택된 것이 원인이다. Jackson 3 BOM을 명시적으로 마지막에 import해 공유 annotation까지 정렬했고, 같은 통합 테스트와 실제 HTTP 조회가 통과했다.

## 남은 한계와 복습

- 공식 문서에 없는 조합의 로컬 성공은 공급자의 공식 지원 보장을 뜻하지 않는다.
- 기준 커밋의 study 쓰기는 동기 Elasticsearch 색인을 생략하지 않는다. 추가 POST 확인의 500은 JSON/JPA 이후 이 외부 연결에서 발생했고 게시판 기능 변경 범위로 분리했다. 글쓰기 변경 통합 후 저장·재조회 검증이 필요하다.
- 실제 Elasticsearch, Redis, MongoDB, S3 연동과 컨테이너 이미지 실행은 미검증이다. MongoDB 미실행으로 연결 경고는 발생했지만 H2/API 부팅과 읽기는 통과했다.
- Gradle 10에서 제거될 기존 delegate API의 deprecation 경고가 남는다. 이번 범위는 최신 안정 Gradle 9.8 실행이며 관련 없는 빌드 스크립트 전면 정리는 포함하지 않는다.
- 복습: 실행 JDK와 JVM target은 어떻게 다른가? BOM과 직접 버전 지정의 우선순위는 무엇인가? wrapper checksum은 무엇을 검증하는가?
