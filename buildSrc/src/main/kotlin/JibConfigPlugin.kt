import com.google.cloud.tools.jib.gradle.JibExtension
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.provideDelegate

class JibConfigPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        project.pluginManager.withPlugin("com.google.cloud.tools.jib") {
            project.extensions.configure<JibExtension> {
                val githubUsername = "DolphaGo"
                val githubToken = "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"
                val mainClassName: String by project
                val imageVersion: String? by project

                // 이미지 이름 설정
                val imageName = "ghcr.io/$githubUsername/${project.rootProject.name}${project.path.replace(":", "/").toLowerCase()}"

                println("======================== jib ========================")
                println("projectName : ${project.name}")
                println("imageName : $imageName")
                println("imageVersion : $imageVersion")
                println("=====================================================")

                from.image = "openjdk:17-jre-slim"  // 베이스 이미지를 OpenJDK 17로 설정
                to {
                    image = "$imageName:$imageVersion"
                    auth {
                        username = githubUsername
                        password = githubToken
                    }
                }
                container {
                    environment = mapOf("MAIN_CLASS" to mainClassName)
                    creationTime.set("USE_CURRENT_TIMESTAMP")
                    entrypoint = listOf("INHERIT")
                }
            }
        }
    }
}
