rootProject.name = "board"

include("board-entity")
include("board-api")
include("board-support")
include("board-front:board-front-api")
findProject(":board-front:board-front-api")?.name = "board-front-api"

pluginManagement {
    val kotlinVersion = "1.9.23"
    val springBootVersion = "3.2.4"
    val springDependencyManagementVersion = "1.1.4"
    val sonarqubeVersion = "3.0"
    val jibVersion = "3.3.1"
    val ktlintVersion = "11.0.0"
    val koverVersion = "0.6.1"

    resolutionStrategy {
        eachPlugin {
            when (requested.id.id) {
                "org.jetbrains.kotlin.jvm" -> useVersion(kotlinVersion)
                "org.jetbrains.kotlin.plugin.spring" -> useVersion(kotlinVersion)
                "org.jetbrains.kotlin.plugin.jpa" -> useVersion(kotlinVersion)
                "org.jetbrains.kotlin.kapt" -> useVersion(kotlinVersion)
                "org.springframework.boot" -> useVersion(springBootVersion)
                "io.spring.dependency-management" -> useVersion(springDependencyManagementVersion)
                "com.google.cloud.tools.jib" -> useVersion(jibVersion)
                "org.sonarqube" -> useVersion(sonarqubeVersion)
                "org.jlleitschuh.gradle.ktlint" -> useVersion(ktlintVersion)
                "org.jetbrains.kotlinx.kover" -> useVersion(koverVersion)
            }
        }
    }
}
