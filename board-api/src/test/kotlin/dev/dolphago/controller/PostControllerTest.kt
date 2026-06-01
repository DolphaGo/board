package dev.dolphago.controller

import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Member
import dev.dolphago.mysql.Post
import dev.dolphago.service.PostService
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlin.test.Test
import kotlin.test.assertEquals

class PostControllerTest {
    private val postService = mockk<PostService>()
    private val controller = PostController(postService)

    @Test
    fun `게시글 생성 요청은 서비스를 호출하고 응답 DTO를 반환한다`() {
        val author = Member(
            id = 1L,
            email = "writer@example.com",
            nickname = "writer",
            role = Authority.ROLE_USER
        )
        val savedPost = Post(
            id = 10L,
            member = author,
            title = "코프링 게시판 검색",
            content = "저장 후 Elasticsearch 색인을 연결한다",
            viewCount = 0,
            display = true
        )
        every {
            postService.createPost(
                memberId = 1L,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다"
            )
        } returns savedPost

        val response = controller.createPost(
            CreatePostRequest(
                memberId = 1L,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다"
            )
        )

        assertEquals(
            PostResponse(
                id = 10L,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다",
                viewCount = 0,
                display = true
            ),
            response.body
        )
        verify(exactly = 1) {
            postService.createPost(
                memberId = 1L,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다"
            )
        }
    }
}
