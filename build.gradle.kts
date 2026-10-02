import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.springframework.boot.gradle.tasks.bundling.BootJar

val jar: Jar by tasks
val bootJar: BootJar by tasks

jar.enabled = false
bootJar.enabled = false

plugins {
    id("org.springframework.boot") version Versions.springBootVersion
    id("io.spring.dependency-management") version Versions.springDependencyManagementVersion
    id("org.sonarqube") version Versions.sonarqubeVersion
    id("org.jlleitschuh.gradle.ktlint") version Versions.ktlintVersion
    id("org.jetbrains.kotlinx.kover") version Versions.koverVersion
    kotlin("plugin.spring") version Versions.kotlinVersion
    kotlin("plugin.jpa") version Versions.kotlinVersion
    kotlin("jvm") version Versions.kotlinVersion
    kotlin("kapt") version Versions.kotlinVersion
}

allprojects {
    apply {
        plugin("kotlin")
        plugin("kotlin-spring")
        plugin("kotlin-jpa")
        plugin("kotlin-kapt")
        plugin("org.jlleitschuh.gradle.ktlint")
        plugin("idea")
        plugin("com.google.cloud.tools.jib")
        plugin("org.springframework.boot")
        plugin("io.spring.dependency-management")
        plugin("org.sonarqube")
        plugin("org.jetbrains.kotlinx.kover")
    }

    group = "dev.dolphago"

    repositories {
        mavenCentral()
        maven(url = "https://plugins.gradle.org/m2/")
        maven(url = "https://repo.spring.io/snapshot")
        maven(url = "https://repo.spring.io/milestone")
        maven(url = "https://packages.confluent.io/maven/")
    }

    tasks.withType<Test> {
        useJUnitPlatform()
        maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).takeIf { it > 0 } ?: 1
        finalizedBy("koverVerify")
    }

    sonar.properties {
        property("sonar.coverage.jacoco.xmlReportPaths", "build/reports/kover/report.xml")
        property("sonar.gradle.skipCompile", "true")
    }

    tasks.withType<JavaCompile>() {
        options.compilerArgs.add("-parameters")
    }

    // Kotlin 최신 안정판은 JVM 26까지 생성한다. 실행 JDK 27과 출력 바이트코드를 구분한다.
    kotlin{
        target {
            compilerOptions {
                freeCompilerArgs = listOf("-Xjsr305=strict")
                jvmTarget = JvmTarget.JVM_26
            }
        }
    }

    java {
        toolchain.languageVersion.set(JavaLanguageVersion.of(27))
        sourceCompatibility = JavaVersion.VERSION_26
        targetCompatibility = JavaVersion.VERSION_26
    }

    extra["kotlin.version"] = Versions.kotlinVersion
    extra["kotlin-coroutines.version"] = Versions.coroutineVersion
    extra["jackson-bom.version"] = Versions.jacksonVersion

    dependencyManagement {
        imports {
            mavenBom("org.springframework.cloud:spring-cloud-dependencies:${Versions.springCloudDependenciesVersion}")
            // Jackson 2/3가 공유하는 annotations도 Jackson 3 BOM과 같은 버전으로 정렬한다.
            mavenBom("tools.jackson:jackson-bom:${Versions.jacksonVersion}")
        }
    }

    dependencies {
        implementation(Dependencies.JACKSON)
        implementation(Dependencies.LOGGING)
        testImplementation(Dependencies.TEST)
        kapt("org.springframework.boot:spring-boot-configuration-processor")
    }

    kover {
        reports {
            filters {
                excludes {
                    classes("*.*Config*", "*.*Application*")
                    packages("*.configuration.*")
                    annotatedBy("*Generated*")
                }
            }

            total {
                xml {
                    onCheck = true
                }
                verify {
                    onCheck = true
                    rule {
                        minBound(0)
                    }
                }
            }
        }
    }
}
