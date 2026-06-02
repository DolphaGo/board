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
                imageUrls = listOf("https://cdn.example.com/first.png", "https://cdn.example.com/second.png"),
                viewCount = 0,
                display = true,
            )
        every {
            postService.createPost(
                memberId = 1L,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다",
                imageUrls = listOf("https://cdn.example.com/first.png", "https://cdn.example.com/second.png"),
                notice = false,
            )
        } returns savedPost

        val response =
            controller.createPost(
                CreatePostRequest(
                    memberId = 1L,
                    title = "코프링 게시판 검색",
                    content = "저장 후 Elasticsearch 색인을 연결한다",
                    imageUrls = listOf("https://cdn.example.com/first.png", "https://cdn.example.com/second.png"),
                ),
            )

        assertEquals(
            PostResponse(
                id = 10L,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다",
                imageUrls = listOf("https://cdn.example.com/first.png", "https://cdn.example.com/second.png"),
                viewCount = 0,
                display = true,
                notice = false,
            ),
            response.body,
        )
        verify(exactly = 1) {
            postService.createPost(
                memberId = 1L,
                title = "코프링 게시판 검색",
                content = "저장 후 Elasticsearch 색인을 연결한다",
                imageUrls = listOf("https://cdn.example.com/first.png", "https://cdn.example.com/second.png"),
                notice = false,
            )
        }
    }

    @Test
    fun `공지 게시글 생성 요청은 notice 플래그를 서비스에 전달한다`() {
        val admin =
            Member(
                id = 1L,
                email = "admin@example.com",
                nickname = "admin",
                role = Authority.ROLE_ADMIN,
            )
        val savedPost =
            Post(
                id = 11L,
                member = admin,
                title = "점검 공지",
                content = "검색 색인 점검 시간을 안내한다",
                viewCount = 0,
                display = true,
                notice = true,
            )
        every {
            postService.createPost(
                memberId = 1L,
                title = "점검 공지",
                content = "검색 색인 점검 시간을 안내한다",
                notice = true,
            )
        } returns savedPost

        val response =
            controller.createPost(
                CreatePostRequest(
                    memberId = 1L,
                    title = "점검 공지",
                    content = "검색 색인 점검 시간을 안내한다",
                    notice = true,
                ),
            )

        assertEquals(
            PostResponse(
                id = 11L,
                title = "점검 공지",
                content = "검색 색인 점검 시간을 안내한다",
                imageUrls = emptyList(),
                viewCount = 0,
                display = true,
                notice = true,
            ),
            response.body,
        )
        verify(exactly = 1) {
            postService.createPost(
                memberId = 1L,
                title = "점검 공지",
                content = "검색 색인 점검 시간을 안내한다",
                notice = true,
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
                imageUrls = emptyList(),
                viewCount = 3,
                display = true,
                notice = false,
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
    fun `게시글 댓글 목록 조회는 응답 DTO 목록을 반환한다`() {
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
        val comments =
            listOf(
                Comment(
                    id = 20L,
                    post = post,
                    member = author,
                    content = "첫 댓글",
                    display = true,
                ),
                Comment(
                    id = 21L,
                    post = post,
                    member = author,
                    content = "두 번째 댓글",
                    display = true,
                ),
            )
        every { postService.listComments(postId = 10L) } returns comments

        val response = controller.listComments(id = 10L)

        assertEquals(
            listOf(
                CommentResponse(
                    id = 20L,
                    postId = 10L,
                    memberId = 1L,
                    authorNickname = "writer",
                    content = "첫 댓글",
                    display = true,
                    createdAt = comments[0].createDate,
                ),
                CommentResponse(
                    id = 21L,
                    postId = 10L,
                    memberId = 1L,
                    authorNickname = "writer",
                    content = "두 번째 댓글",
                    display = true,
                    createdAt = comments[1].createDate,
                ),
            ),
            response.body,
        )
        verify(exactly = 1) { postService.listComments(postId = 10L) }
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
    fun `게시글 숨김 요청은 서비스를 호출하고 숨김 응답 DTO를 반환한다`() {
        val author =
            Member(
                id = 2L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )
        val hiddenPost =
            Post(
                id = 10L,
                member = author,
                title = "숨김 게시글",
                content = "관리자가 목록과 검색에서 숨긴다",
                viewCount = 3,
                display = false,
            )
        every {
            postService.hidePost(
                postId = 10L,
                actorMemberId = 1L,
            )
        } returns hiddenPost

        val response =
            controller.hidePost(
                id = 10L,
                request = HidePostRequest(actorMemberId = 1L),
            )

        assertEquals(
            PostResponse(
                id = 10L,
                title = "숨김 게시글",
                content = "관리자가 목록과 검색에서 숨긴다",
                imageUrls = emptyList(),
                viewCount = 3,
                display = false,
                notice = false,
            ),
            response.body,
        )
        verify(exactly = 1) {
            postService.hidePost(
                postId = 10L,
                actorMemberId = 1L,
            )
        }
    }

    @Test
    fun `게시글 복구 요청은 서비스를 호출하고 복구 응답 DTO를 반환한다`() {
        val author =
            Member(
                id = 2L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )
        val restoredPost =
            Post(
                id = 10L,
                member = author,
                title = "복구 게시글",
                content = "관리자가 목록과 검색에 다시 노출한다",
                viewCount = 3,
                display = true,
            )
        every {
            postService.restorePost(
                postId = 10L,
                actorMemberId = 1L,
            )
        } returns restoredPost

        val response =
            controller.restorePost(
                id = 10L,
                request = RestorePostRequest(actorMemberId = 1L),
            )

        assertEquals(
            PostResponse(
                id = 10L,
                title = "복구 게시글",
                content = "관리자가 목록과 검색에 다시 노출한다",
                imageUrls = emptyList(),
                viewCount = 3,
                display = true,
                notice = false,
            ),
            response.body,
        )
        verify(exactly = 1) {
            postService.restorePost(
                postId = 10L,
                actorMemberId = 1L,
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
                    imageUrls = emptyList(),
                    viewCount = 3,
                    display = true,
                    notice = false,
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

    @Test
    fun `숨김 게시글 목록 조회는 관리자 식별자를 서비스에 전달하고 게시판 메타를 반환한다`() {
        val author =
            Member(
                id = 2L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )
        val hiddenPost =
            Post(
                id = 10L,
                member = author,
                title = "숨김 게시글",
                content = "관리자가 복구할 대상을 찾는다",
                viewCount = 3,
                display = false,
            )
        every { postService.listHiddenPosts(actorMemberId = 1L) } returns
            listOf(
                PostListItem(
                    post = hiddenPost,
                    commentCount = 2,
                    recommendCount = 5,
                ),
            )

        val response = controller.listHiddenPosts(actorMemberId = 1L)

        assertEquals(
            listOf(
                PostListItemResponse(
                    id = 10L,
                    title = "숨김 게시글",
                    content = "관리자가 복구할 대상을 찾는다",
                    imageUrls = emptyList(),
                    viewCount = 3,
                    display = false,
                    notice = false,
                    authorNickname = "writer",
                    createdAt = hiddenPost.createDate,
                    commentCount = 2,
                    recommendCount = 5,
                ),
            ),
            response.body,
        )
        verify(exactly = 1) { postService.listHiddenPosts(actorMemberId = 1L) }
    }
}
