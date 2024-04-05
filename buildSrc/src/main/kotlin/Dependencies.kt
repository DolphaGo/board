object Dependencies {

    val API = listOf(
        "org.springframework.boot:spring-boot-starter-web",
        "org.springframework.boot:spring-boot-starter-validation",
        "org.springframework.data:spring-data-commons",
        "org.springdoc:springdoc-openapi-ui:${Versions.springDocVersion}",
        "org.springdoc:springdoc-openapi-kotlin:${Versions.springDocVersion}"
    )

    val JPA = listOf(
        "org.springframework.boot:spring-boot-starter-data-jpa",
        "com.querydsl:querydsl-jpa:${Versions.querydslVersion}",
    )

    val JPA_KAPT = listOf(
        "com.querydsl:querydsl-jpa:${Versions.querydslVersion}",
        "com.querydsl:querydsl-apt:${Versions.querydslVersion}:jpa",
        "jakarta.persistence:jakarta.persistence-api",
        "jakarta.annotation:jakarta.annotation-api"
    )

    val MYSQL = listOf(
        "mysql:mysql-connector-java:8.0.32"
    )

    val REDIS = listOf(
        "org.springframework.boot:spring-boot-starter-data-redis"
    )

    val FEIGN = listOf(
        "org.springframework.cloud:spring-cloud-starter-openfeign:${Versions.springCloudVersion}",
        "io.github.openfeign:feign-okhttp:10.10.1"
    )

    val JACKSON = listOf(
        "com.fasterxml.jackson.module:jackson-module-kotlin",
        "org.jetbrains.kotlin:kotlin-reflect",
        "com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.13.4"
    )

    val LOGGING = "io.github.microutils:kotlin-logging-jvm:2.1.23"

    val TEST = listOf(
        "org.jetbrains.kotlin:kotlin-test",
        "io.mockk:mockk:1.12.3",
        "org.springframework.boot:spring-boot-starter-test"
    )
}