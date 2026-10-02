package dev.dolphago.study

import dev.dolphago.member.repository.MemberRepository
import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Member
import dev.dolphago.mysql.Post
import dev.dolphago.post.repository.PostRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.springframework.context.annotation.AnnotationConfigApplicationContext
import java.util.function.Supplier
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertSame
import kotlin.test.assertTrue

class StudyDataInitializerTest {
    private val memberRepository = mockk<MemberRepository>()
    private val postRepository = mockk<PostRepository>()
    private val initializer = StudyDataInitializer(memberRepository, postRepository)

    @Test
    fun `빈 저장소에 관리자와 일반 회원 및 목록 검증용 게시글을 준비한다`() {
        val members = mutableListOf<Member>()
        val posts = mutableListOf<Post>()
        every { memberRepository.count() } returns 0
        every { postRepository.count() } returns 0
        every { memberRepository.save(capture(members)) } answers {
            firstArg<Member>().apply { id = members.size.toLong() }
        }
        every { postRepository.save(capture(posts)) } answers { firstArg() }

        initializer.run()

        assertEquals(listOf(Authority.ROLE_ADMIN, Authority.ROLE_USER), members.map { it.role })
        assertEquals(listOf(1L, 2L), members.map { it.id })
        val visiblePosts = posts.filter { it.display }
        assertEquals(13, visiblePosts.size)
        assertEquals(12, visiblePosts.count { !it.notice })
        assertEquals(1, posts.count { !it.display })
        assertSame(members[0], visiblePosts.single { it.notice }.member)
        assertTrue(visiblePosts.filter { !it.notice }.all { it.member === members[1] })
        assertTrue(visiblePosts.any { it.title.length >= 80 })
    }

    @Test
    fun `회원 데이터가 있으면 학습 데이터를 추가하지 않는다`() {
        every { memberRepository.count() } returns 1
        every { postRepository.count() } returns 0
        every { memberRepository.save(any()) } answers { firstArg() }
        every { postRepository.save(any()) } answers { firstArg() }

        initializer.run()

        verify(exactly = 0) { memberRepository.save(any()) }
        verify(exactly = 0) { postRepository.save(any()) }
    }

    @Test
    fun `게시글 데이터가 있으면 학습 데이터를 추가하지 않는다`() {
        every { memberRepository.count() } returns 0
        every { postRepository.count() } returns 1
        every { memberRepository.save(any()) } answers { firstArg() }
        every { postRepository.save(any()) } answers { firstArg() }

        initializer.run()

        verify(exactly = 0) { memberRepository.save(any()) }
        verify(exactly = 0) { postRepository.save(any()) }
    }

    @Test
    fun `study 프로필에서만 초기화하며 prod가 함께 켜지면 제외한다`() {
        val profileCases =
            listOf(
                emptyArray<String>() to false,
                arrayOf("prod") to false,
                arrayOf("study", "prod") to false,
                arrayOf("study") to true,
            )

        profileCases.forEach { (profiles, expected) ->
            AnnotationConfigApplicationContext().use { context ->
                context.environment.setActiveProfiles(*profiles)
                context.registerBean("memberRepository", MemberRepository::class.java, Supplier { memberRepository })
                context.registerBean("postRepository", PostRepository::class.java, Supplier { postRepository })
                context.register(StudyDataInitializer::class.java)
                context.refresh()

                assertEquals(expected, context.getBeansOfType(StudyDataInitializer::class.java).isNotEmpty())
            }
        }
    }
}
