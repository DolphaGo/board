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
        "mysql:mysql-connector-java:8.0.32",
        "com.github.gavlyukovskiy:p6spy-spring-boot-starter:1.9.1"
    )

    val H2 = listOf(
        "com.h2database:h2",
        "com.github.gavlyukovskiy:p6spy-spring-boot-starter:1.9.1"
    )

    val REDIS = listOf(
        "org.springframework.boot:spring-boot-starter-data-redis"
    )

    val FEIGN = listOf(
        "org.springframework.cloud:spring-cloud-starter-openfeign",
        "io.github.openfeign:feign-okhttp"
    )

    val JACKSON = listOf(
        "com.fasterxml.jackson.module:jackson-module-kotlin",
        "org.jetbrains.kotlin:kotlin-reflect",
        "com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.13.4"
    )

    val LOGGING = "io.github.microutils:kotlin-logging-jvm:3.0.5"

    val TEST = listOf(
        "org.jetbrains.kotlin:kotlin-test",
        "io.mockk:mockk:1.12.3",
        "org.springframework.boot:spring-boot-starter-test"
    )
}
