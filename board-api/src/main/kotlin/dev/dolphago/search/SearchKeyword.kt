package dev.dolphago.search

import java.util.Locale

@JvmInline
value class SearchKeyword private constructor(
    val value: String,
) {
    companion object {
        private val whitespaceRegex = Regex("\\s+")

        fun from(rawKeyword: String): SearchKeyword {
            val normalized =
                rawKeyword
                    .trim()
                    .replace(whitespaceRegex, " ")
                    .lowercase(Locale.ROOT)

            require(normalized.isNotBlank()) { "검색어는 비어 있을 수 없습니다." }

            // 검색어 정규화는 Elasticsearch 검색과 Redis 랭킹 기록이 같은 키를 쓰게 만드는 출발점이다.
            // 예를 들어 " Kotlin  SpringBoot "와 "kotlin springboot"가 다른 검색어로 집계되면
            // 랭킹 품질이 떨어지고, 검색 로그를 분석할 때도 같은 의도를 여러 키로 다시 합쳐야 한다.
            return SearchKeyword(normalized)
        }
    }
}
