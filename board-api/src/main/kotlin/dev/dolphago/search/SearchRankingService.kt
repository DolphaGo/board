package dev.dolphago.search

import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service

data class SearchRankingItem(
    val keyword: String,
    val score: Long,
)

data class SearchKeywordSuggestionItem(
    val keyword: String,
    val score: Long,
    val matchType: SearchKeywordSuggestionMatchType,
    val matchDescription: String,
)

enum class SearchKeywordSuggestionMatchType {
    TEXT_PREFIX,
    SYLLABLE_PREFIX,
    INITIAL_PREFIX,
}

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
    ): List<SearchKeywordSuggestionItem> {
        require(limit > 0) { "추천 개수는 1 이상이어야 합니다." }

        val prefix = SearchKeyword.from(rawKeyword).value
        val syllablePrefix = KoreanSyllableTokenizer.tokenizeSyllablePrefix(prefix)
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
                val matchType =
                    findSuggestionMatchType(
                        keyword = keyword,
                        prefix = prefix,
                        syllablePrefix = syllablePrefix,
                        initialPrefix = initialPrefix,
                    ) ?: return@mapNotNull null
                SearchKeywordSuggestionItem(
                    keyword = keyword,
                    score = tuple.score?.toLong() ?: 0L,
                    matchType = matchType,
                    matchDescription = suggestionMatchDescriptionOf(matchType),
                )
            }
            .take(limit.toInt())
            .toList()
    }

    private fun suggestionMatchDescriptionOf(matchType: SearchKeywordSuggestionMatchType): String =
        // matchType만 내려주면 화면마다 설명 문구가 갈라질 수 있다.
        // 학습용 API에서는 서버가 실제 판정 로직과 같은 위치에서 설명까지 내려줘야 ZSET 기반 추천 계약을 한 번에 읽을 수 있다.
        when (matchType) {
            SearchKeywordSuggestionMatchType.TEXT_PREFIX ->
                "저장된 검색어 원문이 입력한 prefix로 시작합니다."
            SearchKeywordSuggestionMatchType.SYLLABLE_PREFIX ->
                "저장된 검색어를 자모로 분해한 값이 입력한 음절 prefix로 시작합니다."
            SearchKeywordSuggestionMatchType.INITIAL_PREFIX ->
                "저장된 검색어의 초성 토큰이 입력한 prefix로 시작합니다."
        }

    private fun findSuggestionMatchType(
        keyword: String,
        prefix: String,
        syllablePrefix: String,
        initialPrefix: String,
    ): SearchKeywordSuggestionMatchType? {
        if (keyword.startsWith(prefix)) {
            return SearchKeywordSuggestionMatchType.TEXT_PREFIX
        }

        // 사용자가 "ㅋㅗ"처럼 초성+중성을 직접 입력하면 초성만 비교해서는 "코"와 "카"를 구분할 수 없다.
        // 저장된 원문 검색어도 같은 음절 토큰으로 분해한 뒤 prefix 비교하면 더 구체적인 자동완성이 가능하다.
        if (
            syllablePrefix.isNotBlank() &&
            KoreanSyllableTokenizer.tokenizeSyllablePrefix(keyword).startsWith(syllablePrefix)
        ) {
            return SearchKeywordSuggestionMatchType.SYLLABLE_PREFIX
        }

        if (syllablePrefix != initialPrefix) {
            // "ㅋㅗ"처럼 중성까지 입력한 경우에는 사용자가 이미 "코" 계열을 의도한 상태다.
            // 여기서 다시 초성 "ㅋ"만으로 fallback하면 "카프카" 같은 다른 모음 검색어가 섞여 추천 품질이 떨어진다.
            return null
        }

        // 랭킹 ZSET에는 사용자가 실제 검색한 원문을 저장한다.
        // 자동완성에서 "ㅋㅍ" 같은 초성 입력까지 지원하려면 저장된 원문을 초성 토큰으로 바꿔 같은 prefix 규칙으로 비교한다.
        return if (KoreanSyllableTokenizer.tokenizeInitials(keyword).startsWith(initialPrefix)) {
            SearchKeywordSuggestionMatchType.INITIAL_PREFIX
        } else {
            null
        }
    }

    companion object {
        const val RANKING_KEY = "board:search:keyword-ranking"
    }
}
