import org.springframework.boot.gradle.tasks.bundling.BootJar

val jar: Jar by tasks
val bootJar: BootJar by tasks

bootJar.enabled = false
jar.enabled = true

dependencies {
    implementation(project(":board-support"))

    implementation(Dependencies.JPA)
    implementation(Dependencies.MYSQL)
    kapt(Dependencies.JPA_KAPT)
}
