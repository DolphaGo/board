package dev.dolphago.search

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlin.test.Test
import kotlin.test.assertEquals

class SearchRankingControllerTest {
    private val searchRankingService = mockk<SearchRankingService>()
    private val controller = SearchRankingController(searchRankingService)

    @Test
    fun `검색어 순위 조회는 기본 10개를 반환한다`() {
        val rankings = listOf(SearchRankingItem(keyword = "kotlin", score = 5))
        every { searchRankingService.getTopKeywords(10) } returns rankings

        val response = controller.getTopKeywords()

        assertEquals(rankings, response.body)
        verify(exactly = 1) { searchRankingService.getTopKeywords(10) }
    }

    @Test
    fun `검색어 순위 조회 개수를 요청 파라미터로 조절할 수 있다`() {
        every { searchRankingService.getTopKeywords(3) } returns emptyList()

        controller.getTopKeywords(limit = 3)

        verify(exactly = 1) { searchRankingService.getTopKeywords(3) }
    }

    @Test
    fun `검색어 순위 조회 개수가 1보다 작으면 400을 반환한다`() {
        val response = controller.getTopKeywords(limit = 0)

        assertEquals(400, response.statusCode.value())
        verify(exactly = 0) { searchRankingService.getTopKeywords(any()) }
    }

    @Test
    fun `검색어 추천은 키워드와 개수를 랭킹 서비스에 전달한다`() {
        val suggestions =
            listOf(
                SearchKeywordSuggestionItem(
                    keyword = "kotlin spring",
                    score = 7,
                    matchType = SearchKeywordSuggestionMatchType.TEXT_PREFIX,
                ),
            )
        every { searchRankingService.suggest(rawKeyword = "Kotlin", limit = 3) } returns suggestions

        val response = controller.suggestKeywords(keyword = "Kotlin", limit = 3)

        assertEquals(suggestions, response.body)
        verify(exactly = 1) { searchRankingService.suggest(rawKeyword = "Kotlin", limit = 3) }
    }

    @Test
    fun `검색어 추천 키워드가 비어 있으면 400을 반환한다`() {
        val response = controller.suggestKeywords(keyword = "   ", limit = 3)

        assertEquals(400, response.statusCode.value())
        verify(exactly = 0) { searchRankingService.suggest(any(), any()) }
    }

    @Test
    fun `검색어 추천 개수가 1보다 작으면 400을 반환한다`() {
        val response = controller.suggestKeywords(keyword = "kotlin", limit = 0)

        assertEquals(400, response.statusCode.value())
        verify(exactly = 0) { searchRankingService.suggest(any(), any()) }
    }

    @Test
    fun `검색어 기록 요청은 검색어를 랭킹 서비스에 전달한다`() {
        every { searchRankingService.record("Kotlin Spring") } returns Unit

        val response = controller.recordKeyword(SearchKeywordRecordRequest(keyword = "Kotlin Spring"))

        assertEquals(204, response.statusCode.value())
        verify(exactly = 1) { searchRankingService.record("Kotlin Spring") }
    }

    @Test
    fun `검색어 기록 요청의 검색어가 비어 있으면 400을 반환한다`() {
        val response = controller.recordKeyword(SearchKeywordRecordRequest(keyword = "   "))

        assertEquals(400, response.statusCode.value())
        verify(exactly = 0) { searchRankingService.record(any()) }
    }
}
