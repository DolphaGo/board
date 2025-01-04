plugins {
    id("org.jetbrains.kotlinx.kover.aggregation") version "0.9.0"
}

kover {
    enableCoverage()
    reports {
        verify {
            check(true)
            rule {
                filters {
                    excludesAnnotatedBy.add("*.Generated*")
                    excludedClasses.addAll("*.*Config*", "*.*Application*")
                }

                bound {
                    minValue = 0
                }
            }
        }
    }
}

rootProject.name = "board"

include("board-entity")
include("board-api")
include("board-support")
include("board-front:board-front-api")
findProject(":board-front:board-front-api")?.name = "board-front-api"


