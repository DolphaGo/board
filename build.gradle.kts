import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import org.springframework.boot.gradle.tasks.bundling.BootJar

val jar: Jar by tasks
val bootJar: BootJar by tasks

jar.enabled = false
bootJar.enabled = false

plugins {
    id("org.springframework.boot")
    id("io.spring.dependency-management")
    id("org.sonarqube")
    id("com.google.cloud.tools.jib")
    id("org.jlleitschuh.gradle.ktlint")
    id("org.jetbrains.kotlinx.kover")
    kotlin("plugin.spring")
    kotlin("plugin.jpa")
    kotlin("jvm")
    kotlin("kapt")
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
        plugin("kover")
    }

    group = "me.dolphago"

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
        finalizedBy("koverMergedVerify")
    }

    koverMerged {
        enable()
        filters {
            classes {
                excludes += listOf("*.*Config*", "*.*Application*", "*.configuration.*")
            }
        }

        verify {
            enable()
            onCheck.set(true)
            rule {
                isEnabled = true
                target = kotlinx.kover.api.VerificationTarget.ALL

                overrideClassFilter {
                    excludes += listOf("*.*Config*", "*.*Application*", "*.configuration.*")
                }

                bound {
                    minValue = 0
                    counter = kotlinx.kover.api.CounterType.LINE
                    valueType = kotlinx.kover.api.VerificationValueType.COVERED_PERCENTAGE
                }
            }
        }
    }

    sonarqube.properties {
        property("sonar.coverage.jacoco.xmlReportPaths", "$buildDir/reports/kover/merged/xml/report.xml")
    }

    tasks.withType<KotlinCompile> {
        kotlinOptions {
            freeCompilerArgs = listOf("-Xjsr305=strict")
            jvmTarget = "17"
        }
    }

    java {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    dependencies {
        implementation(Dependencies.JACKSON)
        implementation(Dependencies.LOGGING)
        testImplementation(Dependencies.TEST)
        kapt("org.springframework.boot:spring-boot-configuration-processor")
    }
}
