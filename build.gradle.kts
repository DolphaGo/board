import org.jetbrains.kotlin.gradle.ExperimentalKotlinGradlePluginApi
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

    sonarqube.properties {
        property("sonar.coverage.jacoco.xmlReportPaths", "${project.layout.buildDirectory}/reports/kover/report.xml")
        property("sonar.gradle.skipCompile", "true")
    }

    tasks.withType<JavaCompile>() {
        options.compilerArgs.add("-parameters")
    }

    kotlin{
        target {
            @OptIn(ExperimentalKotlinGradlePluginApi::class)
            compilerOptions {
                freeCompilerArgs = listOf("-Xjsr305=strict")
                jvmTarget = JvmTarget.JVM_21
            }
        }
    }

    java {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    dependencyManagement {
        imports {
            mavenBom("org.springframework.cloud:spring-cloud-dependencies:${Versions.springCloudDependenciesVersion}")
        }
    }

    dependencies {
        implementation(Dependencies.JACKSON)
        implementation(Dependencies.LOGGING)
        testImplementation(Dependencies.TEST)
        kapt("org.springframework.boot:spring-boot-configuration-processor")
    }
}
