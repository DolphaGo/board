import com.google.cloud.tools.jib.gradle.JibExtension
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.provideDelegate

class JibConfigPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        project.pluginManager.withPlugin("com.google.cloud.tools.jib") {
            project.extensions.configure<JibExtension> {
                val imageName: String by lazy {
                    project.rootProject.name + project.path.replace(":", "/").toLowerCase()
                }
                val imageVersion: String? by project
                val mainClassName: String by project

                println("======================== jib ========================")
                println("projectName : ${project.name}")
                println("imageName : $imageName")
                println("imageVersion : ${imageVersion ?: "local"}")
                println("=====================================================")

                from.image = "{{fromImage}}"
                to {
                    image = "{{toImage}}"
                    auth {
                        username = "{{userName}}"
                        password = "{{password}}"
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
