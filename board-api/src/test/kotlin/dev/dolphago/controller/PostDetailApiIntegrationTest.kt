package dev.dolphago.controller

import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.ActiveProfiles
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import kotlin.test.Test
import kotlin.test.assertEquals

@ActiveProfiles("study")
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = ["spring.datasource.url=jdbc:h2:mem:board-detail-test"],
)
class PostDetailApiIntegrationTest {
    @LocalServerPort
    private var port: Int = 0

    @Test
    fun `상세는 본문과 작성자를 반환하고 조회수를 올리며 없는 글은 404를 반환한다`() {
        HttpClient.newHttpClient().use { client ->
            fun get(id: Long) =
                client.send(
                    HttpRequest.newBuilder(URI("http://localhost:$port/api/posts/$id")).GET().build(),
                    HttpResponse.BodyHandlers.ofString(),
                )
            val first = get(1)
            assertEquals(200, first.statusCode())
            val mapper = JsonMapper.builder().build()
            val firstBody = mapper.readTree(first.body())
            assertEquals("학습 게시판 이용 안내", firstBody.path("title").asText())
            assertEquals("학습 관리자", firstBody.path("authorNickname").asText())
            assertEquals(1, firstBody.path("viewCount").asInt())
            assertEquals(2, mapper.readTree(get(1).body()).path("viewCount").asInt())
            assertEquals(404, get(999999).statusCode())
        }
    }
}
