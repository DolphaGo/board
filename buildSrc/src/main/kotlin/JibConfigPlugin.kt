import com.google.cloud.tools.jib.gradle.JibExtension
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.provideDelegate

class JibConfigPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        project.pluginManager.withPlugin("com.google.cloud.tools.jib") {
            project.extensions.configure<JibExtension> {
                val mainClassName: String by project

//                from.image = System.getenv("FROM_IMAGE")
                to {
                    image = System.getenv("TO_IMAGE")
                    auth {
                        username = System.getenv("GHCR_USERNAME")
                        password = System.getenv("GHCR_PASSWORD")
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
