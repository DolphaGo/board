import org.springframework.boot.gradle.tasks.bundling.BootJar

val jar: Jar by tasks
val bootJar: BootJar by tasks

bootJar.enabled = false
jar.enabled = true

dependencies {
    implementation(Dependencies.FEIGN)
    implementation("com.aventrix.jnanoid:jnanoid:2.0.0")
}
