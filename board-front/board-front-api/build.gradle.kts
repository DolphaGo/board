import org.gradle.api.tasks.Exec
import org.springframework.boot.gradle.tasks.bundling.BootJar

val jar: Jar by tasks
val bootJar: BootJar by tasks

jar.enabled = true
bootJar.enabled = true
bootJar.mainClass.set("dev.dolphago.BoardFrontApiApplicationKt")
bootJar.manifest {
    attributes(
        mapOf(
            "Implementation-Title" to project.name,
            "Implementation-Version" to project.version,
        ),
    )
}

val frontUiDir = "$rootDir/board-front/board-front-ui"

ext {
    set("mainClassName", "dev.dolphago.BoardFrontApiApplicationKt")
}

dependencies {
    implementation(project(":board-support"))
    implementation(Dependencies.API)
    implementation(Dependencies.FEIGN)
    implementation(platform("io.awspring.cloud:spring-cloud-aws-dependencies:${Versions.springCloudAwsVersion}"))
    implementation("io.awspring.cloud:spring-cloud-aws-starter-s3")
}

apply<JibConfigPlugin>()

tasks.processResources {
    from("$frontUiDir/dist/") {
        into("static")
    }
    dependsOn(buildFrontend)
}

val installFrontendDependencies by tasks.registering(Exec::class) {
    group = "build"
    description = "board-front-ui 의존성을 pnpm-lock.yaml 기준으로 설치한다."

    workingDir = file(frontUiDir)
    commandLine("pnpm", "install", "--frozen-lockfile")

    inputs.file("$frontUiDir/package.json")
    inputs.file("$frontUiDir/pnpm-lock.yaml")
    outputs.dir("$frontUiDir/node_modules")
}

val buildFrontend by tasks.registering(Exec::class) {
    group = "build"
    description = "board-front-ui를 Vite 정적 파일로 빌드한다."

    // node-gradle PnpmTask는 pnpmSetup에서 npm으로 pnpm을 다시 설치한다.
    // 이 프로젝트는 pnpm을 직접 쓰는 연습용 구성이므로 Gradle에서도 같은 CLI를 호출해 설치 경로를 단순하게 유지한다.
    dependsOn(installFrontendDependencies)

    workingDir = file(frontUiDir)
    commandLine("pnpm", "run", "build")

    inputs.file("$frontUiDir/package.json")
    inputs.file("$frontUiDir/pnpm-lock.yaml")
    inputs.file("$frontUiDir/index.html")
    inputs.file("$frontUiDir/tsconfig.json")
    inputs.file("$frontUiDir/vite.config.ts")
    inputs.dir("$frontUiDir/src")
    outputs.dir("$frontUiDir/dist")
}
