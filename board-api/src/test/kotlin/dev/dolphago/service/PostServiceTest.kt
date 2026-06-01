package dev.dolphago.service

import dev.dolphago.member.repository.MemberRepository
import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Member
import dev.dolphago.mysql.Post
import dev.dolphago.post.repository.PostRepository
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
    private val postSearchIndexService = mockk<PostSearchIndexService>()
    private val postService = PostService(postRepository, memberRepository, postSearchIndexService)

    @Test
    fun `게시글 생성 후 ES 검색 문서로 색인한다`() {
        val author = Member(
            id = 1L,
            email = "writer@example.com",
            nickname = "writer",
            role = Authority.ROLE_USER
        )
        val postSlot = slot<Post>()

        every { memberRepository.findById(1L) } returns Optional.of(author)
        every { postRepository.save(capture(postSlot)) } answers {
            firstArg<Post>().apply { id = 10L }
        }
        every { postSearchIndexService.index(any()) } returns PostSearchDocument(
            id = 10L,
            title = "코프링 검색 게시글",
            content = "Elasticsearch 색인까지 연결한다"
        )

        val post = postService.createPost(
            memberId = 1L,
            title = "코프링 검색 게시글",
            content = "Elasticsearch 색인까지 연결한다"
        )

        assertEquals(10L, post.id)
        assertEquals("코프링 검색 게시글", postSlot.captured.title)
        assertEquals("Elasticsearch 색인까지 연결한다", postSlot.captured.content)
        assertEquals(0L, postSlot.captured.viewCount)
        assertEquals(true, postSlot.captured.display)
        verify(exactly = 1) { postSearchIndexService.index(post) }
    }

    @Test
    fun `게시글 단건을 조회한다`() {
        val author = Member(
            id = 1L,
            email = "writer@example.com",
            nickname = "writer",
            role = Authority.ROLE_USER
        )
        val post = Post(
            id = 10L,
            member = author,
            title = "코프링 검색 게시글",
            content = "상세 화면에서 보여줄 본문",
            viewCount = 3,
            display = true
        )
        every { postRepository.findById(10L) } returns Optional.of(post)

        val result = postService.getPost(10L)

        assertEquals(post, result)
        verify(exactly = 1) { postRepository.findById(10L) }
    }
}
