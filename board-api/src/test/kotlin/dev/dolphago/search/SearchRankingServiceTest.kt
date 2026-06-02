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
        every {
            zSetOperations.incrementScore(SearchRankingService.SOURCE_RANKING_KEY, "direct", 1.0)
        } returns 1.0

        searchRankingService.record("  Kotlin   SpringBoot  ")

        verify(exactly = 1) {
            zSetOperations.incrementScore(SearchRankingService.RANKING_KEY, "kotlin springboot", 1.0)
        }
        verify(exactly = 1) {
            zSetOperations.incrementScore(SearchRankingService.SOURCE_RANKING_KEY, "direct", 1.0)
        }
    }

    @Test
    fun `검색어 기록 시 검색 유입 경로 점수도 1 증가시킨다`() {
        every { redisTemplate.opsForZSet() } returns zSetOperations
        every {
            zSetOperations.incrementScore(SearchRankingService.RANKING_KEY, "kotlin springboot", 1.0)
        } returns 1.0
        every {
            zSetOperations.incrementScore(SearchRankingService.SOURCE_RANKING_KEY, "suggestion", 1.0)
        } returns 1.0

        searchRankingService.record("  Kotlin   SpringBoot  ", "suggestion")

        verify(exactly = 1) {
            zSetOperations.incrementScore(SearchRankingService.RANKING_KEY, "kotlin springboot", 1.0)
        }
        verify(exactly = 1) {
            zSetOperations.incrementScore(SearchRankingService.SOURCE_RANKING_KEY, "suggestion", 1.0)
        }
    }

    @Test
    fun `검색 유입 경로가 알 수 없는 값이면 직접 검색으로 기록한다`() {
        every { redisTemplate.opsForZSet() } returns zSetOperations
        every {
            zSetOperations.incrementScore(SearchRankingService.RANKING_KEY, "kotlin springboot", 1.0)
        } returns 1.0
        every {
            zSetOperations.incrementScore(SearchRankingService.SOURCE_RANKING_KEY, "direct", 1.0)
        } returns 1.0

        searchRankingService.record("  Kotlin   SpringBoot  ", "unknown")

        verify(exactly = 1) {
            zSetOperations.incrementScore(SearchRankingService.SOURCE_RANKING_KEY, "direct", 1.0)
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

    @Test
    fun `검색 유입 경로 순위는 높은 점수 순으로 조회한다`() {
        val first = mockk<ZSetOperations.TypedTuple<String>>()
        val second = mockk<ZSetOperations.TypedTuple<String>>()

        every { first.value } returns "suggestion"
        every { first.score } returns 8.0
        every { second.value } returns "ranking"
        every { second.score } returns 5.0
        every { redisTemplate.opsForZSet() } returns zSetOperations
        every {
            zSetOperations.reverseRangeWithScores(SearchRankingService.SOURCE_RANKING_KEY, 0, 1)
        } returns linkedSetOf(first, second)

        val result = searchRankingService.getTopSources(limit = 2)

        assertEquals(
            listOf(
                SearchSourceRankingItem(
                    source = "suggestion",
                    label = "추천어 선택",
                    score = 8,
                    description = "자동완성 추천어를 선택해서 검색 결과로 진입한 횟수입니다.",
                ),
                SearchSourceRankingItem(
                    source = "ranking",
                    label = "실시간 검색어 클릭",
                    score = 5,
                    description = "실시간 검색어 순위 항목을 클릭해서 검색 결과로 진입한 횟수입니다.",
                ),
            ),
            result,
        )
    }

    @Test
    fun `검색어 추천은 정규화된 입력으로 시작하는 인기 검색어만 반환한다`() {
        val first = mockk<ZSetOperations.TypedTuple<String>>()
        val second = mockk<ZSetOperations.TypedTuple<String>>()
        val third = mockk<ZSetOperations.TypedTuple<String>>()

        every { first.value } returns "kotlin spring"
        every { first.score } returns 7.0
        every { second.value } returns "kotlin elasticsearch"
        every { second.score } returns 5.0
        every { third.value } returns "spring boot"
        every { third.score } returns 4.0
        every { redisTemplate.opsForZSet() } returns zSetOperations
        every {
            zSetOperations.reverseRangeWithScores(SearchRankingService.RANKING_KEY, 0, -1)
        } returns linkedSetOf(first, second, third)

        val result = searchRankingService.suggest(rawKeyword = "  Kotlin  ", limit = 1)

        assertEquals(
            listOf(
                SearchKeywordSuggestionItem(
                    keyword = "kotlin spring",
                    score = 7,
                    matchType = SearchKeywordSuggestionMatchType.TEXT_PREFIX,
                    matchDescription = "저장된 검색어 원문이 입력한 prefix로 시작합니다.",
                    inputToken = "kotlin",
                    keywordToken = "kotlin spring",
                ),
            ),
            result,
        )
        verify(exactly = 1) {
            zSetOperations.reverseRangeWithScores(SearchRankingService.RANKING_KEY, 0, -1)
        }
    }

    @Test
    fun `검색어 추천은 초성 입력으로 시작하는 한글 인기 검색어도 반환한다`() {
        val first = mockk<ZSetOperations.TypedTuple<String>>()
        val second = mockk<ZSetOperations.TypedTuple<String>>()
        val third = mockk<ZSetOperations.TypedTuple<String>>()

        every { first.value } returns "코프링 검색"
        every { first.score } returns 9.0
        every { second.value } returns "코틀린 게시판"
        every { second.score } returns 7.0
        every { third.value } returns "스프링 검색"
        every { third.score } returns 4.0
        every { redisTemplate.opsForZSet() } returns zSetOperations
        every {
            zSetOperations.reverseRangeWithScores(SearchRankingService.RANKING_KEY, 0, -1)
        } returns linkedSetOf(first, second, third)

        val result = searchRankingService.suggest(rawKeyword = "ㅋㅍ", limit = 2)

        assertEquals(
            listOf(
                SearchKeywordSuggestionItem(
                    keyword = "코프링 검색",
                    score = 9,
                    matchType = SearchKeywordSuggestionMatchType.INITIAL_PREFIX,
                    matchDescription = "저장된 검색어의 초성 토큰이 입력한 prefix로 시작합니다.",
                    inputToken = "ㅋ ㅍ",
                    keywordToken = "ㅋ ㅍ ㄹ ㄱ ㅅ",
                ),
            ),
            result,
        )
    }

    @Test
    fun `검색어 추천은 초성과 중성으로 입력한 음절 prefix를 구분한다`() {
        val first = mockk<ZSetOperations.TypedTuple<String>>()
        val second = mockk<ZSetOperations.TypedTuple<String>>()

        every { first.value } returns "코프링 검색"
        every { first.score } returns 9.0
        every { second.value } returns "카프카 검색"
        every { second.score } returns 8.0
        every { redisTemplate.opsForZSet() } returns zSetOperations
        every {
            zSetOperations.reverseRangeWithScores(SearchRankingService.RANKING_KEY, 0, -1)
        } returns linkedSetOf(first, second)

        val result = searchRankingService.suggest(rawKeyword = "ㅋㅗ", limit = 5)

        assertEquals(
            listOf(
                SearchKeywordSuggestionItem(
                    keyword = "코프링 검색",
                    score = 9,
                    matchType = SearchKeywordSuggestionMatchType.SYLLABLE_PREFIX,
                    matchDescription = "저장된 검색어를 자모로 분해한 값이 입력한 음절 prefix로 시작합니다.",
                    inputToken = "ㅋ ㅗ",
                    keywordToken = "ㅋ ㅗ ㅍ ㅡ ㄹ ㅣ ㅇ ㄱ ㅓ ㅁ ㅅ ㅐ ㄱ",
                ),
            ),
            result,
        )
    }

    @Test
    fun `검색어 추천은 입력 토큰과 저장 키워드 토큰을 함께 반환한다`() {
        val first = mockk<ZSetOperations.TypedTuple<String>>()

        every { first.value } returns "코프링 검색"
        every { first.score } returns 9.0
        every { redisTemplate.opsForZSet() } returns zSetOperations
        every {
            zSetOperations.reverseRangeWithScores(SearchRankingService.RANKING_KEY, 0, -1)
        } returns linkedSetOf(first)

        val result = searchRankingService.suggest(rawKeyword = "ㅋㅗ", limit = 5).single()

        assertEquals("ㅋ ㅗ", result.inputToken)
        assertEquals("ㅋ ㅗ ㅍ ㅡ ㄹ ㅣ ㅇ ㄱ ㅓ ㅁ ㅅ ㅐ ㄱ", result.keywordToken)
    }
}
