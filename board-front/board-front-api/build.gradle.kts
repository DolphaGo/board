import com.github.gradle.node.pnpm.task.PnpmTask
import org.springframework.boot.gradle.tasks.bundling.BootJar

plugins {
    id("com.github.node-gradle.node") version "7.0.2"
}

val jar: Jar by tasks
val bootJar: BootJar by tasks

jar.enabled = true
bootJar.enabled = true
bootJar.mainClass.set("dev.dolphago.BoardFrontApiApplicationKt")
bootJar.manifest {
    attributes(
        mapOf(
            "Implementation-Title" to project.name,
            "Implementation-Version" to project.version
        )
    )
}

var frontUiDir = "$rootDir/board-front/board-front-ui"

ext {
    set("mainClassName", "dev.dolphago.BoardFrontApiApplicationKt")
}

dependencies {
    implementation(project(":board-support"))
    implementation(Dependencies.API)
    implementation(Dependencies.FEIGN)
}

apply<JibConfigPlugin>()

node {
    version.set("21.7.3")
    nodeProjectDir.set(file(frontUiDir))
    download.set(true)
}

tasks.processResources {
    from("$frontUiDir/dist/") {
        into("static")
    }
    dependsOn(buildFrontend)
}

val buildFrontend by tasks.registering(PnpmTask::class) {
    dependsOn("pnpmInstall")
    args.set(listOf("run", "build"))
}
