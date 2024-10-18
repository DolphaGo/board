rootProject.name = "board"

include("board-entity")
include("board-api")
include("board-support")
include("board-front:board-front-api")
findProject(":board-front:board-front-api")?.name = "board-front-api"
