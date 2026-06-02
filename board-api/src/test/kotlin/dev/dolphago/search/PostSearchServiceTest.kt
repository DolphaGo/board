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
                            notice = true,
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

        assertEquals(1, results.size)
        assertEquals(1L, results.single().postId)
        assertEquals("kotlin spring", results.single().title)
        assertEquals("Elasticsearch scoring example content", results.single().contentPreview)
        assertEquals(true, results.single().display)
        assertEquals(10.5f, results.single().score)
        assertEquals(mapOf("title" to listOf("<em>kotlin</em> spring")), results.single().highlights)
        assertEquals(
            listOf(
                PostSearchScoreSignal(
                    field = "title",
                    category = "BM25_TEXT",
                    label = "제목 원문",
                    boost = 3.0f,
                    keyword = "kotlin spring",
                    description = "제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.",
                    applied = true,
                ),
                PostSearchScoreSignal(
                    field = "content",
                    category = "BM25_TEXT",
                    label = "본문 원문",
                    boost = 1.0f,
                    keyword = "kotlin spring",
                    description = "본문 원문 match는 제목보다 넓은 recall을 담당한다.",
                    applied = false,
                ),
                PostSearchScoreSignal(
                    field = "titleSyllables",
                    category = "SYLLABLE_RECALL",
                    label = "제목 음절",
                    boost = 1.5f,
                    keyword = "kotlin spring",
                    description = "음절 분해 제목 필드는 한글 부분 기억과 오타성 검색을 보조한다.",
                    applied = false,
                ),
                PostSearchScoreSignal(
                    field = "contentSyllables",
                    category = "SYLLABLE_RECALL",
                    label = "본문 음절",
                    boost = 0.5f,
                    keyword = "kotlin spring",
                    description = "음절 분해 본문 필드는 넓게 찾되 원문 점수를 넘지 않게 낮게 둔다.",
                    applied = false,
                ),
                PostSearchScoreSignal(
                    field = "titleInitials",
                    category = "INITIAL_RECALL",
                    label = "제목 초성",
                    boost = 1.0f,
                    keyword = "kotlin spring",
                    description = "제목 초성 필드는 ㅋㅌㄹ 같은 초성 입력을 위한 보조 신호다.",
                    applied = false,
                ),
                PostSearchScoreSignal(
                    field = "contentInitials",
                    category = "INITIAL_RECALL",
                    label = "본문 초성",
                    boost = 0.25f,
                    keyword = "kotlin spring",
                    description = "본문 초성 필드는 충돌이 많아 가장 낮은 boost로 둔다.",
                    applied = false,
                ),
                PostSearchScoreSignal(
                    field = "notice",
                    category = "FUNCTION_SCORE",
                    label = "공지 가산점",
                    boost = 2.0f,
                    keyword = "notice=true",
                    description = "공지글은 function_score sum 모드로 관련도 점수에 작은 운영 가산점을 더한다.",
                    applied = true,
                ),
            ),
            results.single().scoringSignals,
        )
        assertEquals(3, querySlot.captured.pageable.pageSize)
        verify(exactly = 1) { elasticsearchOperations.search(any<NativeQuery>(), PostSearchDocument::class.java) }
    }

    @Test
    fun `게시글 검색 preview는 이미지 Markdown URL 대신 이미지 설명만 남긴다`() {
        every {
            elasticsearchOperations.search(any<NativeQuery>(), PostSearchDocument::class.java)
        } returns
            SearchHitsImpl(
                1,
                TotalHitsRelation.EQUAL_TO,
                8.0f,
                Duration.ofMillis(8),
                null,
                null,
                listOf(
                    SearchHit(
                        "board-posts",
                        "2",
                        null,
                        8.0f,
                        emptyArray(),
                        mapOf("content" to listOf("<em>본문</em>")),
                        emptyMap(),
                        null,
                        null,
                        emptyMap(),
                        PostSearchDocument(
                            id = 2L,
                            title = "이미지 글",
                            content =
                                "첫 문단\n\n" +
                                    "![첨부 이미지 1](https://cdn.example.com/body.png)\n" +
                                    "둘째 문단",
                            viewCount = 1,
                            display = true,
                            notice = false,
                        ),
                    ),
                ),
                null,
                null,
                null,
            )

        val result = postSearchService.search("본문", 10).single()

        assertEquals("첫 문단 [이미지: 첨부 이미지 1] 둘째 문단", result.contentPreview)
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

    @Test
    fun `게시글 검색은 한글 음절 토큰 필드를 낮은 가중치로 함께 조회한다`() {
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

        postSearchService.search("코틀린", 10)

        val query = requireNotNull(querySlot.captured.query)
        val baseQuery = requireNotNull(query.functionScore().query())
        val matchQueries =
            baseQuery
                .bool()
                .should()
                .filter { it.isMatch() }
                .associate { it.match().field() to it.match() }

        assertEquals("ㅋ ㅗ ㅌ ㅡ ㄹ ㄹ ㅣ ㄴ", matchQueries.getValue("titleSyllables").query().stringValue())
        assertEquals(1.5f, matchQueries.getValue("titleSyllables").boost())
        assertEquals("ㅋ ㅗ ㅌ ㅡ ㄹ ㄹ ㅣ ㄴ", matchQueries.getValue("contentSyllables").query().stringValue())
        assertEquals(0.5f, matchQueries.getValue("contentSyllables").boost())
    }

    @Test
    fun `게시글 검색은 초성 입력을 초성 토큰 필드로 함께 조회한다`() {
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

        postSearchService.search("ㅋㅌㄹ", 10)

        val query = requireNotNull(querySlot.captured.query)
        val baseQuery = requireNotNull(query.functionScore().query())
        val matchQueries =
            baseQuery
                .bool()
                .should()
                .filter { it.isMatch() }
                .associate { it.match().field() to it.match() }

        assertEquals("ㅋ ㅌ ㄹ", matchQueries.getValue("titleInitials").query().stringValue())
        assertEquals(1.0f, matchQueries.getValue("titleInitials").boost())
        assertEquals("ㅋ ㅌ ㄹ", matchQueries.getValue("contentInitials").query().stringValue())
        assertEquals(0.25f, matchQueries.getValue("contentInitials").boost())
    }
}
