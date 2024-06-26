import org.springframework.boot.gradle.tasks.bundling.BootJar

val jar: Jar by tasks
val bootJar: BootJar by tasks
bootJar.enabled = true
bootJar.mainClass.set("dev.dolphago.BoardApiApplicationKt")
bootJar.manifest {
    attributes(
        mapOf(
            "Implementation-Title" to project.name,
            "Implementation-Version" to project.version
        )
    )
}

jar.enabled = true

ext {
    set("mainClassName", "dev.dolphago.BoardApiApplicationKt")
}

apply<JibConfigPlugin>()

dependencies {
    implementation(project(":board-entity"))
    implementation(project(":board-support"))

    implementation(Dependencies.MYSQL)
    implementation(Dependencies.H2)
    implementation(Dependencies.API)
    implementation(Dependencies.JPA)
    implementation(Dependencies.FEIGN)
    implementation(Dependencies.REDIS)
    kapt(Dependencies.JPA_KAPT)
}

// https://kauth.kakao.com/oauth/authorize?response_type=code&client_id={여기에 REST API KEY를 입력해주세요}&redirect_uri=http://localhost:8080/callback
