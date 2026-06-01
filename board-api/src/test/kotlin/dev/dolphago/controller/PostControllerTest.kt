package dev.dolphago.controller

import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Comment
import dev.dolphago.mysql.Member
import dev.dolphago.mysql.Post
import dev.dolphago.mysql.PostRecommend
import dev.dolphago.service.PostListItem
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
        val author =
            Member(
                id = 1L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )
        val savedPost =
            Post(
                id = 10L,
                member = author,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다",
                viewCount = 0,
                display = true,
            )
        every {
            postService.createPost(
                memberId = 1L,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다",
            )
        } returns savedPost

        val response =
            controller.createPost(
                CreatePostRequest(
                    memberId = 1L,
                    title = "코프링 게시판 검색",
                    content = "저장 후 Elasticsearch 색인을 연결한다",
                ),
            )

        assertEquals(
            PostResponse(
                id = 10L,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다",
                viewCount = 0,
                display = true,
            ),
            response.body,
        )
        verify(exactly = 1) {
            postService.createPost(
                memberId = 1L,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다",
            )
        }
    }

    @Test
    fun `게시글 단건 조회는 응답 DTO를 반환한다`() {
        val author =
            Member(
                id = 1L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )
        val post =
            Post(
                id = 10L,
                member = author,
                title = "코프링 게시판 검색",
                content = "상세 화면에서 보여줄 본문",
                viewCount = 3,
                display = true,
            )
        every { postService.getPost(10L) } returns post

        val response = controller.getPost(10L)

        assertEquals(
            PostResponse(
                id = 10L,
                title = "코프링 게시판 검색",
                content = "상세 화면에서 보여줄 본문",
                viewCount = 3,
                display = true,
            ),
            response.body,
        )
        verify(exactly = 1) { postService.getPost(10L) }
    }

    @Test
    fun `게시글 댓글 생성 요청은 서비스를 호출하고 응답 DTO를 반환한다`() {
        val author =
            Member(
                id = 1L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )
        val post =
            Post(
                id = 10L,
                member = author,
                title = "코프링 게시판 검색",
                content = "상세 화면에서 보여줄 본문",
                viewCount = 3,
                display = true,
            )
        val comment =
            Comment(
                id = 20L,
                post = post,
                member = author,
                content = "검색 스코어링 설명이 좋아요",
                display = true,
            )
        every {
            postService.createComment(
                postId = 10L,
                memberId = 1L,
                content = "검색 스코어링 설명이 좋아요",
            )
        } returns comment

        val response =
            controller.createComment(
                id = 10L,
                request =
                    CreateCommentRequest(
                        memberId = 1L,
                        content = "검색 스코어링 설명이 좋아요",
                    ),
            )

        assertEquals(
            CommentResponse(
                id = 20L,
                postId = 10L,
                memberId = 1L,
                authorNickname = "writer",
                content = "검색 스코어링 설명이 좋아요",
                display = true,
                createdAt = comment.createDate,
            ),
            response.body,
        )
        verify(exactly = 1) {
            postService.createComment(
                postId = 10L,
                memberId = 1L,
                content = "검색 스코어링 설명이 좋아요",
            )
        }
    }

    @Test
    fun `게시글 추천 생성 요청은 서비스를 호출하고 응답 DTO를 반환한다`() {
        val author =
            Member(
                id = 1L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )
        val post =
            Post(
                id = 10L,
                member = author,
                title = "코프링 게시판 검색",
                content = "상세 화면에서 보여줄 본문",
                viewCount = 3,
                display = true,
            )
        val recommend =
            PostRecommend(
                id = 30L,
                post = post,
                member = author,
                display = true,
            )
        every {
            postService.createRecommend(
                postId = 10L,
                memberId = 1L,
            )
        } returns recommend

        val response =
            controller.createRecommend(
                id = 10L,
                request = CreateRecommendRequest(memberId = 1L),
            )

        assertEquals(
            PostRecommendResponse(
                id = 30L,
                postId = 10L,
                memberId = 1L,
                display = true,
                createdAt = recommend.createDate,
            ),
            response.body,
        )
        verify(exactly = 1) {
            postService.createRecommend(
                postId = 10L,
                memberId = 1L,
            )
        }
    }

    @Test
    fun `게시글 목록 조회는 게시판 메타를 포함한 응답 DTO를 반환한다`() {
        val author =
            Member(
                id = 1L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )
        val post =
            Post(
                id = 10L,
                member = author,
                title = "코프링 게시판 검색",
                content = "목록에서 보여줄 본문",
                viewCount = 3,
                display = true,
            )
        every { postService.listPosts() } returns
            listOf(
                PostListItem(
                    post = post,
                    commentCount = 2,
                    recommendCount = 5,
                ),
            )

        val response = controller.listPosts()

        assertEquals(
            listOf(
                PostListItemResponse(
                    id = 10L,
                    title = "코프링 게시판 검색",
                    content = "목록에서 보여줄 본문",
                    viewCount = 3,
                    display = true,
                    authorNickname = "writer",
                    createdAt = post.createDate,
                    commentCount = 2,
                    recommendCount = 5,
                ),
            ),
            response.body,
        )
        verify(exactly = 1) { postService.listPosts() }
    }
}
