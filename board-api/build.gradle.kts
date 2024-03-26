import org.springframework.boot.gradle.tasks.bundling.BootJar

val jar: Jar by tasks
val bootJar: BootJar by tasks
bootJar.enabled = true
bootJar.mainClass.set("me.dolphago.BoardApiApplicationKt")
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
    set("mainClassName", "me.dolphago.BoardApiApplicationKt")
}

apply<JibConfigPlugin>()

dependencies {
    implementation(project(":board-entity"))
    implementation(project(":board-support"))

    implementation(Dependencies.API)
    implementation(Dependencies.JPA)
    implementation(Dependencies.FEIGN)
    implementation(Dependencies.REDIS)
    kapt(Dependencies.JPA_KAPT)
}
