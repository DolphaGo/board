package dev.dolphago.service

import dev.dolphago.member.repository.MemberRepository
import dev.dolphago.comment.repository.CommentRepository
import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Comment
import dev.dolphago.mysql.Member
import dev.dolphago.mysql.Post
import dev.dolphago.post.repository.PostRepository
import dev.dolphago.recommend.repository.PostRecommendRepository
import dev.dolphago.search.PostSearchDocument
import dev.dolphago.search.PostSearchIndexService
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.util.Optional
import kotlin.test.Test
import kotlin.test.assertEquals

class PostServiceTest {
    private val postRepository = mockk<PostRepository>()
    private val memberRepository = mockk<MemberRepository>()
    private val commentRepository = mockk<CommentRepository>()
    private val postRecommendRepository = mockk<PostRecommendRepository>()
    private val postSearchIndexService = mockk<PostSearchIndexService>()
    private val postService =
        PostService(
            postRepository = postRepository,
            memberRepository = memberRepository,
            commentRepository = commentRepository,
            postRecommendRepository = postRecommendRepository,
            postSearchIndexService = postSearchIndexService,
        )

    @Test
    fun `게시글 생성 후 ES 검색 문서로 색인한다`() {
        val author =
            Member(
                id = 1L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )
        val postSlot = slot<Post>()

        every { memberRepository.findById(1L) } returns Optional.of(author)
        every { postRepository.save(capture(postSlot)) } answers {
            firstArg<Post>().apply { id = 10L }
        }
        every { postSearchIndexService.index(any()) } returns
            PostSearchDocument(
                id = 10L,
                title = "코프링 검색 게시글",
                content = "Elasticsearch 색인까지 연결한다",
            )

        val post =
            postService.createPost(
                memberId = 1L,
                title = "코프링 검색 게시글",
                content = "Elasticsearch 색인까지 연결한다",
            )

        assertEquals(10L, post.id)
        assertEquals("코프링 검색 게시글", postSlot.captured.title)
        assertEquals("Elasticsearch 색인까지 연결한다", postSlot.captured.content)
        assertEquals(0L, postSlot.captured.viewCount)
        assertEquals(true, postSlot.captured.display)
        verify(exactly = 1) { postSearchIndexService.index(post) }
    }

    @Test
    fun `게시글 댓글을 저장한다`() {
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
                title = "코프링 검색 게시글",
                content = "상세 화면에서 보여줄 본문",
                viewCount = 3,
                display = true,
            )
        val commentSlot = slot<Comment>()

        every { postRepository.findById(10L) } returns Optional.of(post)
        every { memberRepository.findById(1L) } returns Optional.of(author)
        every { commentRepository.save(capture(commentSlot)) } answers {
            firstArg<Comment>().apply { id = 20L }
        }

        val comment =
            postService.createComment(
                postId = 10L,
                memberId = 1L,
                content = "검색 스코어링 설명이 좋아요",
            )

        assertEquals(20L, comment.id)
        assertEquals(post, commentSlot.captured.post)
        assertEquals(author, commentSlot.captured.member)
        assertEquals("검색 스코어링 설명이 좋아요", commentSlot.captured.content)
        assertEquals(true, commentSlot.captured.display)
        verify(exactly = 1) { commentRepository.save(any()) }
    }

    @Test
    fun `게시글 단건 조회 시 조회수를 1 증가시킨다`() {
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
                title = "코프링 검색 게시글",
                content = "상세 화면에서 보여줄 본문",
                viewCount = 3,
                display = true,
            )
        every { postRepository.findById(10L) } returns Optional.of(post)

        val result = postService.getPost(10L)

        assertEquals(4L, result.viewCount)
        verify(exactly = 1) { postRepository.findById(10L) }
    }

    @Test
    fun `목록 조회는 노출 게시글만 최신순으로 읽고 댓글 수를 함께 반환한다`() {
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
                title = "코프링 검색 게시글",
                content = "목록에서 보여줄 본문",
                viewCount = 3,
                display = true,
            )
        every { postRepository.findByDisplayTrueOrderByIdDesc() } returns listOf(post)
        every { commentRepository.countByPostIdAndDisplayTrue(10L) } returns 2L
        every { postRecommendRepository.countByPostIdAndDisplayTrue(10L) } returns 5L

        val posts = postService.listPosts()

        assertEquals(post, posts.single().post)
        assertEquals(2L, posts.single().commentCount)
        assertEquals(5L, posts.single().recommendCount)
        assertEquals(3L, post.viewCount)
        verify(exactly = 1) { postRepository.findByDisplayTrueOrderByIdDesc() }
        verify(exactly = 1) { commentRepository.countByPostIdAndDisplayTrue(10L) }
        verify(exactly = 1) { postRecommendRepository.countByPostIdAndDisplayTrue(10L) }
    }
}
