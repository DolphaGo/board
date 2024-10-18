import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
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
        plugin("org.jetbrains.kotlinx.kover")
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

    koverReport {
        defaults {
            filters {
                excludes {
                    classes("*.*Config*", "*.*Application*")
                    packages("*.configuration.*")
                    annotatedBy("*Generated*")
                }
            }

            xml {
                onCheck = true
                filters {
                    excludes {
                        classes("*.*Config*", "*.*Application*")
                        packages("*.configuration.*")
                        annotatedBy("*Generated*")
                    }
                }
            }

            verify {
                onCheck = true
                rule {
                    isEnabled = true
                    entity = kotlinx.kover.gradle.plugin.dsl.GroupingEntityType.APPLICATION
                    filters {
                        excludes {
                            classes("*.*Config*", "*.*Application*")
                            packages("*.configuration.*")
                            annotatedBy("*Generated*")
                        }
                    }

                    bound {
                        minValue = 0
                        metric = kotlinx.kover.gradle.plugin.dsl.MetricType.LINE
                        aggregation = kotlinx.kover.gradle.plugin.dsl.AggregationType.COVERED_PERCENTAGE
                    }
                }
            }
        }
    }

    sonarqube.properties {
        property("sonar.coverage.jacoco.xmlReportPaths", "${project.layout.buildDirectory}/reports/kover/report.xml")
        property("sonar.gradle.skipCompile", "true")
    }

    tasks.withType<JavaCompile>() {
        options.compilerArgs.add("-parameters")
    }

    tasks.withType<KotlinCompile> {
        kotlinOptions {
            freeCompilerArgs = listOf("-Xjsr305=strict")
            jvmTarget = "21"
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
