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
import kotlin.test.assertTrue

@ActiveProfiles("study")
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = ["spring.datasource.url=jdbc:h2:mem:board-list-test"],
)
class PostListApiIntegrationTest {
    @LocalServerPort
    private var port: Int = 0

    @Test
    fun `실제 HTTP와 H2로 공지 우선 정렬과 페이지 경계 및 숨김 제외를 확인한다`() {
        HttpClient.newHttpClient().use { client ->
            fun page(number: Int) =
                client.send(
                    HttpRequest.newBuilder(URI("http://localhost:$port/api/posts?page=$number&size=10")).GET().build(),
                    HttpResponse.BodyHandlers.ofString(),
                ).let { response ->
                    assertEquals(200, response.statusCode())
                    JsonMapper.builder().build().readTree(response.body())
                }

            val first = page(0)
            val last = page(1)
            val beyond = page(2)

            assertEquals(13, first.path("totalElements").asInt())
            assertEquals(2, first.path("totalPages").asInt())
            assertEquals(10, first.path("items").size())
            assertTrue(first.path("items")[0].path("notice").asBoolean())
            assertEquals(3, last.path("items").size())
            assertEquals(1, last.path("page").asInt())
            assertEquals(0, beyond.path("items").size())
            val visible = first.path("items").toList() + last.path("items").toList()
            assertEquals(13, visible.map { it.path("id").asLong() }.distinct().size)
            assertTrue(visible.all { it.path("display").asBoolean() })
            assertTrue(visible.all { it.path("viewCount").asLong() == 0L })
        }
    }
}
