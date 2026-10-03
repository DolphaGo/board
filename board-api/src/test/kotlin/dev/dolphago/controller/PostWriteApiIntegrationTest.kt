package dev.dolphago.controller

import dev.dolphago.member.repository.MemberRepository
import org.springframework.beans.factory.annotation.Autowired
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
    properties = ["spring.datasource.url=jdbc:h2:mem:board-write-test"],
)
class PostWriteApiIntegrationTest {
    @LocalServerPort
    private var port: Int = 0

    @Autowired
    private lateinit var memberRepository: MemberRepository

    private val mapper = JsonMapper.builder().build()

    @Test
    fun `빈 제목은 HTTP 400으로 거절한다`() {
        assertEquals(400, createPost("", "본문").statusCode())
    }

    @Test
    fun `공백뿐인 본문은 HTTP 400으로 거절한다`() {
        assertEquals(400, createPost("제목", " \n\t ").statusCode())
    }

    @Test
    fun `256자 제목은 HTTP 400으로 거절한다`() {
        assertEquals(400, createPost("가".repeat(256), "본문").statusCode())
    }

    @Test
    fun `255자 제목과 긴 Markdown 본문을 저장하고 상세와 목록에서 그대로 읽는다`() {
        val title = "제목".repeat(127) + "끝"
        val content = "# Markdown 저장\n\n" + "본문의 **강조**와 `code` 및 줄바꿈을 그대로 저장합니다.\n".repeat(40)
        assertTrue(content.length > 1000)

        val created = createPost(title, content)
        assertEquals(200, created.statusCode())
        val createdBody = mapper.readTree(created.body())
        val id = createdBody.path("id").asLong()
        assertTrue(id > 0)
        assertEquals(title, createdBody.path("title").asString())
        assertEquals(content, createdBody.path("content").asString())

        HttpClient.newHttpClient().use { client ->
            fun get(path: String) =
                client.send(
                    HttpRequest.newBuilder(URI("http://localhost:$port$path")).GET().build(),
                    HttpResponse.BodyHandlers.ofString(),
                ).let { response ->
                    assertEquals(200, response.statusCode())
                    mapper.readTree(response.body())
                }

            val detail = get("/api/posts/$id")
            val listed = get("/api/posts?page=0&size=50").path("items").single { it.path("id").asLong() == id }
            listOf(detail, listed).forEach { post ->
                assertEquals(title, post.path("title").asString())
                assertEquals(content, post.path("content").asString())
            }
        }
    }

    private fun createPost(title: String, content: String): HttpResponse<String> =
        HttpClient.newHttpClient().use { client ->
            val member = requireNotNull(memberRepository.findByEmail("member@study.example"))
            val body =
                mapper.writeValueAsString(
                    mapOf("memberId" to member.id, "title" to title, "content" to content, "imageUrls" to emptyList<String>(), "notice" to false),
                )
            client.send(
                HttpRequest.newBuilder(URI("http://localhost:$port/api/posts"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build(),
                HttpResponse.BodyHandlers.ofString(),
            )
        }
}
