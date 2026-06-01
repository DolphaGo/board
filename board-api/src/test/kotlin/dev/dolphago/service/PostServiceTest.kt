package dev.dolphago.service

import dev.dolphago.member.repository.MemberRepository
import dev.dolphago.comment.repository.CommentRepository
import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Comment
import dev.dolphago.mysql.Member
import dev.dolphago.mysql.Post
import dev.dolphago.mysql.PostRecommend
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
import kotlin.test.assertFailsWith

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
    fun `관리자는 공지 게시글을 생성할 수 있다`() {
        val admin =
            Member(
                id = 1L,
                email = "admin@example.com",
                nickname = "admin",
                role = Authority.ROLE_ADMIN,
            )
        val postSlot = slot<Post>()

        every { memberRepository.findById(1L) } returns Optional.of(admin)
        every { postRepository.save(capture(postSlot)) } answers {
            firstArg<Post>().apply { id = 11L }
        }
        every { postSearchIndexService.index(any()) } returns
            PostSearchDocument(
                id = 11L,
                title = "점검 공지",
                content = "검색 색인 점검 시간을 안내한다",
            )

        val post =
            postService.createPost(
                memberId = 1L,
                title = "점검 공지",
                content = "검색 색인 점검 시간을 안내한다",
                notice = true,
            )

        assertEquals(11L, post.id)
        assertEquals(true, postSlot.captured.notice)
        verify(exactly = 1) { postRepository.save(any()) }
        verify(exactly = 1) { postSearchIndexService.index(post) }
    }

    @Test
    fun `일반 사용자는 공지 게시글을 생성할 수 없다`() {
        val user =
            Member(
                id = 1L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )

        every { memberRepository.findById(1L) } returns Optional.of(user)

        val exception =
            assertFailsWith<IllegalArgumentException> {
                postService.createPost(
                    memberId = 1L,
                    title = "공지인 척하는 글",
                    content = "일반 사용자는 notice 플래그를 세울 수 없다",
                    notice = true,
                )
            }

        assertEquals("공지 게시글은 관리자만 작성할 수 있습니다.", exception.message)
        verify(exactly = 0) { postRepository.save(any()) }
        verify(exactly = 0) { postSearchIndexService.index(any()) }
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
    fun `게시글 댓글 목록은 노출 댓글만 오래된 순으로 읽는다`() {
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

        every { commentRepository.findByPostIdAndDisplayTrueOrderByIdAsc(10L) } returns comments

        val result = postService.listComments(postId = 10L)

        assertEquals(comments, result)
        verify(exactly = 1) { commentRepository.findByPostIdAndDisplayTrueOrderByIdAsc(10L) }
    }

    @Test
    fun `게시글 추천을 저장한다`() {
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
        val recommendSlot = slot<PostRecommend>()

        every { postRecommendRepository.findByPostIdAndMemberIdAndDisplayTrue(10L, 1L) } returns null
        every { postRepository.findById(10L) } returns Optional.of(post)
        every { memberRepository.findById(1L) } returns Optional.of(author)
        every { postRecommendRepository.save(capture(recommendSlot)) } answers {
            firstArg<PostRecommend>().apply { id = 30L }
        }

        val recommend =
            postService.createRecommend(
                postId = 10L,
                memberId = 1L,
            )

        assertEquals(30L, recommend.id)
        assertEquals(post, recommendSlot.captured.post)
        assertEquals(author, recommendSlot.captured.member)
        assertEquals(true, recommendSlot.captured.display)
        verify(exactly = 1) { postRecommendRepository.findByPostIdAndMemberIdAndDisplayTrue(10L, 1L) }
        verify(exactly = 1) { postRecommendRepository.save(any()) }
    }

    @Test
    fun `이미 추천한 게시글은 기존 추천을 반환하고 새로 저장하지 않는다`() {
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
        val existingRecommend =
            PostRecommend(
                id = 30L,
                post = post,
                member = author,
                display = true,
            )

        every { postRecommendRepository.findByPostIdAndMemberIdAndDisplayTrue(10L, 1L) } returns existingRecommend

        val recommend =
            postService.createRecommend(
                postId = 10L,
                memberId = 1L,
            )

        assertEquals(existingRecommend, recommend)
        verify(exactly = 1) { postRecommendRepository.findByPostIdAndMemberIdAndDisplayTrue(10L, 1L) }
        verify(exactly = 0) { postRepository.findById(any()) }
        verify(exactly = 0) { memberRepository.findById(any()) }
        verify(exactly = 0) { postRecommendRepository.save(any()) }
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
    fun `목록 조회는 공지를 먼저 읽고 같은 그룹에서는 최신순으로 읽는다`() {
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
        val notice =
            Post(
                id = 9L,
                member = author,
                title = "점검 공지",
                content = "공지글은 id가 더 작아도 일반 글보다 먼저 보여야 한다",
                viewCount = 1,
                display = true,
                notice = true,
            )
        every { postRepository.findByDisplayTrueOrderByNoticeDescIdDesc() } returns listOf(notice, post)
        every { commentRepository.countByPostIdAndDisplayTrue(9L) } returns 0L
        every { commentRepository.countByPostIdAndDisplayTrue(10L) } returns 2L
        every { postRecommendRepository.countByPostIdAndDisplayTrue(9L) } returns 0L
        every { postRecommendRepository.countByPostIdAndDisplayTrue(10L) } returns 5L

        val posts = postService.listPosts()

        assertEquals(listOf(notice, post), posts.map { it.post })
        assertEquals(0L, posts[0].commentCount)
        assertEquals(2L, posts[1].commentCount)
        assertEquals(5L, posts[1].recommendCount)
        assertEquals(3L, post.viewCount)
        verify(exactly = 1) { postRepository.findByDisplayTrueOrderByNoticeDescIdDesc() }
        verify(exactly = 1) { commentRepository.countByPostIdAndDisplayTrue(9L) }
        verify(exactly = 1) { commentRepository.countByPostIdAndDisplayTrue(10L) }
        verify(exactly = 1) { postRecommendRepository.countByPostIdAndDisplayTrue(9L) }
        verify(exactly = 1) { postRecommendRepository.countByPostIdAndDisplayTrue(10L) }
    }
}
