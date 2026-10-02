object Dependencies {

    val API = listOf(
        "org.springframework.boot:spring-boot-starter-web",
        "org.springframework.boot:spring-boot-starter-validation",
        "org.springframework.data:spring-data-commons",
        "org.springdoc:springdoc-openapi-starter-webmvc-ui:${Versions.springDocVersion}"
    )

    val JPA = listOf(
        "org.springframework.boot:spring-boot-starter-data-jpa",
        "com.querydsl:querydsl-jpa:${Versions.querydslVersion}:jakarta",
    )

    val JPA_KAPT = listOf(
        "com.querydsl:querydsl-apt:${Versions.querydslVersion}:jakarta",
        "jakarta.persistence:jakarta.persistence-api",
        "jakarta.annotation:jakarta.annotation-api"
    )

    val MYSQL = listOf(
        "com.mysql:mysql-connector-j:${Versions.mysqlVersion}",
        "com.github.gavlyukovskiy:p6spy-spring-boot-starter:${Versions.p6spyVersion}"
    )

    val H2 = listOf(
        "com.h2database:h2",
        "com.github.gavlyukovskiy:p6spy-spring-boot-starter:${Versions.p6spyVersion}"
    )

    val REDIS = listOf(
        "org.springframework.boot:spring-boot-starter-data-redis"
    )

    val ELASTICSEARCH = listOf(
        "org.springframework.boot:spring-boot-starter-data-elasticsearch"
    )

    val WEBSOCKET = listOf(
        "org.springframework.boot:spring-boot-starter-websocket"
    )

    val MONGO = listOf(
        "org.springframework.boot:spring-boot-starter-data-mongodb"
    )

    val FEIGN = listOf(
        "org.springframework.cloud:spring-cloud-starter-openfeign",
        "io.github.openfeign:feign-okhttp"
    )

    val JACKSON = listOf(
        "tools.jackson.module:jackson-module-kotlin",
        "org.jetbrains.kotlin:kotlin-reflect"
    )

    val LOGGING = "io.github.oshai:kotlin-logging-jvm:${Versions.kotlinLoggingVersion}"

    val TEST = listOf(
        "org.jetbrains.kotlin:kotlin-test",
        "io.mockk:mockk:${Versions.mockkVersion}",
        "org.springframework.boot:spring-boot-starter-test"
    )

    val COROUTINE = listOf(
        "org.jetbrains.kotlinx:kotlinx-coroutines-core:${Versions.coroutineVersion}",
        "org.jetbrains.kotlinx:kotlinx-coroutines-reactor:${Versions.coroutineVersion}"
    )
}
