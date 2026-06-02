package dev.dolphago.search

import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service

data class SearchRankingItem(
    val keyword: String,
    val score: Long,
)

@Service
class SearchRankingService(
    private val redisTemplate: StringRedisTemplate,
) {
    fun record(rawKeyword: String) {
        val keyword = SearchKeyword.from(rawKeyword)

        // Redis sorted set은 "값마다 점수를 가진 정렬 컬렉션"이다.
        // 검색어 랭킹은 같은 검색어가 들어올 때마다 점수를 1씩 올리고,
        // 점수가 높은 순서로 읽으면 되기 때문에 ZSET이 가장 단순한 모델이다.
        redisTemplate.opsForZSet().incrementScore(RANKING_KEY, keyword.value, 1.0)
    }

    fun getTopKeywords(limit: Long): List<SearchRankingItem> {
        require(limit > 0) { "조회 개수는 1 이상이어야 합니다." }

        return redisTemplate
            .opsForZSet()
            .reverseRangeWithScores(RANKING_KEY, 0, limit - 1)
            .orEmpty()
            .mapNotNull { tuple ->
                val keyword = tuple.value ?: return@mapNotNull null
                SearchRankingItem(
                    keyword = keyword,
                    score = tuple.score?.toLong() ?: 0L,
                )
            }
    }

    fun suggest(
        rawKeyword: String,
        limit: Long,
    ): List<SearchRankingItem> {
        require(limit > 0) { "추천 개수는 1 이상이어야 합니다." }

        val prefix = SearchKeyword.from(rawKeyword).value
        val initialPrefix = KoreanSyllableTokenizer.tokenizeInitials(prefix)

        return redisTemplate
            .opsForZSet()
            // 학습용 첫 구현은 랭킹 ZSET을 점수순으로 읽고 prefix를 프론트처럼 필터링한다.
            // 운영 서비스라면 검색어 자동완성용 trie, edge-ngram index, Redis lex index를 별도로 두는 편이 낫다.
            .reverseRangeWithScores(RANKING_KEY, 0, -1)
            .orEmpty()
            .asSequence()
            .mapNotNull { tuple ->
                val keyword = tuple.value ?: return@mapNotNull null
                if (!matchesSuggestionKeyword(keyword, prefix, initialPrefix)) {
                    return@mapNotNull null
                }
                SearchRankingItem(
                    keyword = keyword,
                    score = tuple.score?.toLong() ?: 0L,
                )
            }
            .take(limit.toInt())
            .toList()
    }

    private fun matchesSuggestionKeyword(
        keyword: String,
        prefix: String,
        initialPrefix: String,
    ): Boolean {
        if (keyword.startsWith(prefix)) {
            return true
        }

        // 랭킹 ZSET에는 사용자가 실제 검색한 원문을 저장한다.
        // 자동완성에서 "ㅋㅍ" 같은 초성 입력까지 지원하려면 저장된 원문을 초성 토큰으로 바꿔 같은 prefix 규칙으로 비교한다.
        return KoreanSyllableTokenizer.tokenizeInitials(keyword).startsWith(initialPrefix)
    }

    companion object {
        const val RANKING_KEY = "board:search:keyword-ranking"
    }
}
