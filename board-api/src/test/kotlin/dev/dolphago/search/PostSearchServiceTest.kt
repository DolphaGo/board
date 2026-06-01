package dev.dolphago.search

import co.elastic.clients.elasticsearch._types.query_dsl.FunctionBoostMode
import co.elastic.clients.elasticsearch._types.query_dsl.FunctionScoreMode
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.springframework.data.elasticsearch.client.elc.NativeQuery
import org.springframework.data.elasticsearch.core.ElasticsearchOperations
import org.springframework.data.elasticsearch.core.SearchHit
import org.springframework.data.elasticsearch.core.SearchHitsImpl
import org.springframework.data.elasticsearch.core.TotalHitsRelation
import java.time.Duration
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PostSearchServiceTest {
    private val elasticsearchOperations = mockk<ElasticsearchOperations>()
    private val postSearchService = PostSearchService(elasticsearchOperations)

    @Test
    fun `게시글 검색은 ES 검색 점수와 하이라이트를 응답으로 변환한다`() {
        val querySlot = slot<NativeQuery>()
        val searchHits =
            SearchHitsImpl(
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
                        emptyMap(),
                        PostSearchDocument(
                            id = 1L,
                            title = "kotlin spring",
                            content = "Elasticsearch scoring example content",
                            viewCount = 3,
                            display = true,
                        ),
                    ),
                ),
                null,
                null,
                null,
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
                    highlights = mapOf("title" to listOf("<em>kotlin</em> spring")),
                ),
            ),
            results,
        )
        assertEquals(3, querySlot.captured.pageable.pageSize)
        verify(exactly = 1) { elasticsearchOperations.search(any<NativeQuery>(), PostSearchDocument::class.java) }
    }

    @Test
    fun `게시글 검색은 공지 게시글에 ES 점수 가산점을 더한다`() {
        val querySlot = slot<NativeQuery>()
        every {
            elasticsearchOperations.search(capture(querySlot), PostSearchDocument::class.java)
        } returns
            SearchHitsImpl(
                0,
                TotalHitsRelation.EQUAL_TO,
                0.0f,
                Duration.ZERO,
                null,
                null,
                emptyList(),
                null,
                null,
                null,
            )

        postSearchService.search("공지", 10)

        val query = requireNotNull(querySlot.captured.query)
        assertTrue(query.isFunctionScore(), "검색 관련도 점수에 운영 점수를 더하려면 function_score 쿼리를 사용해야 한다.")

        val functionScore = query.functionScore()
        val baseQuery = requireNotNull(functionScore.query())
        assertTrue(baseQuery.isBool(), "기존 title/content/display 검색 조건은 function_score 내부 bool 쿼리로 유지한다.")
        assertEquals(FunctionScoreMode.Sum, functionScore.scoreMode())
        assertEquals(FunctionBoostMode.Sum, functionScore.boostMode())
        assertEquals(1, functionScore.functions().size)

        val noticeBoost = functionScore.functions().single()
        val noticeFilter = requireNotNull(noticeBoost.filter())
        assertEquals(2.0, noticeBoost.weight())
        assertTrue(noticeFilter.isTerm())
        assertEquals("notice", noticeFilter.term().field())
        assertTrue(noticeFilter.term().value().booleanValue())
    }
}
