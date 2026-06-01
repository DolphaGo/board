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
    fun `검색어 기록 요청은 검색어를 랭킹 서비스에 전달한다`() {
        every { searchRankingService.record("Kotlin Spring") } returns Unit

        val response = controller.recordKeyword(SearchKeywordRecordRequest(keyword = "Kotlin Spring"))

        assertEquals(204, response.statusCode.value())
        verify(exactly = 1) { searchRankingService.record("Kotlin Spring") }
    }
}
