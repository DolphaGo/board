package dev.dolphago.search

import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Member
import dev.dolphago.mysql.Post
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.springframework.data.elasticsearch.core.ElasticsearchOperations
import kotlin.test.Test
import kotlin.test.assertEquals

class PostSearchIndexServiceTest {
    private val elasticsearchOperations = mockk<ElasticsearchOperations>()
    private val postSearchIndexService = PostSearchIndexService(elasticsearchOperations)

    @Test
    fun `색인을 끄면 검색 문서를 만들되 ES에는 저장하지 않는다`() {
        every { elasticsearchOperations.save(any<PostSearchDocument>()) } answers { firstArg() }
        val post =
            Post(
                id = 10L,
                member =
                    Member(
                        id = 2L,
                        email = "writer@example.com",
                        nickname = "writer",
                        role = Authority.ROLE_USER,
                    ),
                title = "학습",
                content = "긴 본문",
                viewCount = 7,
                display = true,
            )

        val document = PostSearchIndexService(elasticsearchOperations, indexingEnabled = false).index(post)

        assertEquals(10L, document.id)
        assertEquals("학습", document.title)
        assertEquals("긴 본문", document.content)
        assertEquals("ㅎ ㅏ ㄱ ㅅ ㅡ ㅂ", document.titleSyllables)
        assertEquals("ㅎ ㅅ", document.titleInitials)
        verify(exactly = 0) { elasticsearchOperations.save(any<PostSearchDocument>()) }
    }

    @Test
    fun `게시글을 ES 검색 문서로 저장한다`() {
        val documentSlot = slot<PostSearchDocument>()
        every { elasticsearchOperations.save(capture(documentSlot)) } answers { firstArg() }
        val member =
            Member(
                id = 1L,
                email = "writer@example.com",
                nickname = "writer",
                role = Authority.ROLE_USER,
            )
        val post =
            Post(
                id = 10L,
                member = member,
                title = "코틀린 게시판 검색",
                content = "Elasticsearch 점수 계산을 연습한다",
                viewCount = 7,
                display = true,
                notice = true,
            )

        postSearchIndexService.index(post)

        assertEquals(
            PostSearchDocument(
                id = 10L,
                title = "코틀린 게시판 검색",
                content = "Elasticsearch 점수 계산을 연습한다",
                titleSyllables = KoreanSyllableTokenizer.tokenize("코틀린 게시판 검색"),
                contentSyllables = KoreanSyllableTokenizer.tokenize("Elasticsearch 점수 계산을 연습한다"),
                titleInitials = KoreanSyllableTokenizer.tokenizeInitials("코틀린 게시판 검색"),
                contentInitials = KoreanSyllableTokenizer.tokenizeInitials("Elasticsearch 점수 계산을 연습한다"),
                viewCount = 7,
                display = true,
                notice = true,
            ),
            documentSlot.captured,
        )
        verify(exactly = 1) { elasticsearchOperations.save(any<PostSearchDocument>()) }
    }
}
