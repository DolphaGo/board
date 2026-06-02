package dev.dolphago.search

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlin.test.Test
import kotlin.test.assertEquals

class PostSearchControllerTest {
    private val postSearchService = mockk<PostSearchService>()
    private val searchRankingService = mockk<SearchRankingService>()
    private val controller = PostSearchController(postSearchService, searchRankingService)

    @Test
    fun `게시글 검색은 검색어와 조회 개수를 서비스에 전달한다`() {
        val results =
            listOf(
                PostSearchResult(
                    postId = 1L,
                    title = "Kotlin Spring 검색",
                    contentPreview = "Elasticsearch scoring sample",
                    display = true,
                    score = 12.5f,
                    highlights = mapOf("title" to listOf("<em>Kotlin</em> Spring 검색")),
                    scoreExplanation =
                        PostSearchScoreExplanation(
                            formula = "final_score = bm25_text_score + function_score_bonus",
                            finalScore = 12.5f,
                            appliedSignalCount = 1,
                            totalSignalCount = 1,
                            functionScoreApplied = false,
                            description = "검색 점수 설명",
                        ),
                ),
            )
        every { postSearchService.search("  Kotlin Spring  ", 5) } returns results
        every { searchRankingService.record("  Kotlin Spring  ", "suggestion") } returns Unit

        val response = controller.search(keyword = "  Kotlin Spring  ", size = 5, source = "suggestion")

        assertEquals(results, response.body)
        verify(exactly = 1) { postSearchService.search("  Kotlin Spring  ", 5) }
        verify(exactly = 1) { searchRankingService.record("  Kotlin Spring  ", "suggestion") }
    }

    @Test
    fun `관련 게시글 추천은 현재 글 id를 서비스에 전달하고 검색 랭킹은 기록하지 않는다`() {
        val results =
            listOf(
                PostSearchResult(
                    postId = 11L,
                    title = "Kotlin BM25 추천",
                    contentPreview = "현재 글과 같은 검색 스코어링 계열",
                    display = true,
                    score = 8.5f,
                    highlights = mapOf("title" to listOf("<em>Kotlin</em> BM25 추천")),
                    scoreExplanation =
                        PostSearchScoreExplanation(
                            formula = "final_score = bm25_text_score + function_score_bonus",
                            finalScore = 8.5f,
                            appliedSignalCount = 1,
                            totalSignalCount = 1,
                            functionScoreApplied = false,
                            description = "관련 글 추천 점수 설명",
                        ),
                ),
            )
        every { postSearchService.recommendRelated(currentPostId = 10L, size = 4) } returns results

        val response = controller.recommendRelated(postId = 10L, size = 4)

        assertEquals(results, response.body)
        verify(exactly = 1) { postSearchService.recommendRelated(currentPostId = 10L, size = 4) }
        verify(exactly = 0) { searchRankingService.record(any(), any()) }
    }
}
