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

                from.image = System.getenv("FROM_IMAGE") ?: "amazoncorretto:27.0.0-al2023-headless"
                to {
                    image = System.getenv("TO_IMAGE")
                    auth {
                        username = "DolphaGo"
                        password = System.getenv("GHCR_PASSWORD")
                    }
                }

                container {
                    mainClass = mainClassName
                    creationTime.set("USE_CURRENT_TIMESTAMP")
                }
            }
        }
    }
}
