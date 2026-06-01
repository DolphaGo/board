package dev.dolphago.search

import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Duration
import kotlin.test.Test
import kotlin.test.assertEquals
import org.springframework.data.elasticsearch.client.elc.NativeQuery
import org.springframework.data.elasticsearch.core.ElasticsearchOperations
import org.springframework.data.elasticsearch.core.SearchHit
import org.springframework.data.elasticsearch.core.SearchHitsImpl
import org.springframework.data.elasticsearch.core.TotalHitsRelation

class PostSearchServiceTest {
    private val elasticsearchOperations = mockk<ElasticsearchOperations>()
    private val postSearchService = PostSearchService(elasticsearchOperations)

    @Test
    fun `게시글 검색은 ES 검색 점수와 하이라이트를 응답으로 변환한다`() {
        val querySlot = slot<NativeQuery>()
        val searchHits = SearchHitsImpl(
            1,
            TotalHitsRelation.EQUAL_TO,
            10.5f,
            Duration.ofMillis(12),
            null,
            null,
            listOf(
                SearchHit(
                    "board-posts",
                    "1",
                    null,
                    10.5f,
                    emptyArray(),
                    mapOf("title" to listOf("<em>kotlin</em> spring")),
                    emptyMap(),
                    null,
                    null,
                    emptyList(),
                    PostSearchDocument(
                        id = 1L,
                        title = "kotlin spring",
                        content = "Elasticsearch scoring example content",
                        viewCount = 3,
                        display = true
                    )
                )
            ),
            null,
            null,
            null
        )
        every {
            elasticsearchOperations.search(capture(querySlot), PostSearchDocument::class.java)
        } returns searchHits

        val results = postSearchService.search("  Kotlin   Spring  ", 3)

        assertEquals(
            listOf(
                PostSearchResult(
                    postId = 1L,
                    title = "kotlin spring",
                    contentPreview = "Elasticsearch scoring example content",
                    score = 10.5f,
                    highlights = mapOf("title" to listOf("<em>kotlin</em> spring"))
                )
            ),
            results
        )
        assertEquals(3, querySlot.captured.pageable.pageSize)
        verify(exactly = 1) { elasticsearchOperations.search(any<NativeQuery>(), PostSearchDocument::class.java) }
    }
}
