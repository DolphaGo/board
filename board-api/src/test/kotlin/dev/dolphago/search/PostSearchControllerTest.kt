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
        every { searchRankingService.record("  Kotlin Spring  ") } returns Unit

        val response = controller.search(keyword = "  Kotlin Spring  ", size = 5)

        assertEquals(results, response.body)
        verify(exactly = 1) { postSearchService.search("  Kotlin Spring  ", 5) }
        verify(exactly = 1) { searchRankingService.record("  Kotlin Spring  ") }
    }
}
