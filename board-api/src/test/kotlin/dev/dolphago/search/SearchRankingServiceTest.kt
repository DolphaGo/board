package dev.dolphago.search

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ZSetOperations
import kotlin.test.Test
import kotlin.test.assertEquals

class SearchRankingServiceTest {
    private val redisTemplate = mockk<StringRedisTemplate>()
    private val zSetOperations = mockk<ZSetOperations<String, String>>()
    private val searchRankingService = SearchRankingService(redisTemplate)

    @Test
    fun `검색어 기록 시 정규화된 검색어 점수를 1 증가시킨다`() {
        every { redisTemplate.opsForZSet() } returns zSetOperations
        every {
            zSetOperations.incrementScore(SearchRankingService.RANKING_KEY, "kotlin springboot", 1.0)
        } returns 1.0

        searchRankingService.record("  Kotlin   SpringBoot  ")

        verify(exactly = 1) {
            zSetOperations.incrementScore(SearchRankingService.RANKING_KEY, "kotlin springboot", 1.0)
        }
    }

    @Test
    fun `검색어 순위는 높은 점수 순으로 조회한다`() {
        val first = mockk<ZSetOperations.TypedTuple<String>>()
        val second = mockk<ZSetOperations.TypedTuple<String>>()

        every { first.value } returns "kotlin"
        every { first.score } returns 5.0
        every { second.value } returns "spring boot"
        every { second.score } returns 3.0
        every { redisTemplate.opsForZSet() } returns zSetOperations
        every {
            zSetOperations.reverseRangeWithScores(SearchRankingService.RANKING_KEY, 0, 1)
        } returns linkedSetOf(first, second)

        val result = searchRankingService.getTopKeywords(limit = 2)

        assertEquals(
            listOf(
                SearchRankingItem(keyword = "kotlin", score = 5),
                SearchRankingItem(keyword = "spring boot", score = 3),
            ),
            result,
        )
    }
}
