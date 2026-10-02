import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    `kotlin-dsl`
}

repositories {
    mavenCentral()
    gradlePluginPortal()
}

// Gradle은 JDK 27에서 실행하되 내장 Kotlin의 최대 출력 대상인 JVM 26에 맞춘다.
java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(27))
    sourceCompatibility = JavaVersion.VERSION_26
    targetCompatibility = JavaVersion.VERSION_26
}

tasks.withType<KotlinCompile> {
    compilerOptions {
        freeCompilerArgs = listOf("-Xjsr305=strict")
        jvmTarget = JvmTarget.JVM_26
    }
}

dependencies {
    implementation("com.google.cloud.tools:jib-gradle-plugin:3.5.4")
}
