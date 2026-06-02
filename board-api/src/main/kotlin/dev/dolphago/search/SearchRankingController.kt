package dev.dolphago.search

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

data class SearchKeywordRecordRequest(
    val keyword: String,
)

@RestController
@RequestMapping("/api/search/rankings")
class SearchRankingController(
    private val searchRankingService: SearchRankingService,
) {
    @GetMapping
    fun getTopKeywords(
        @RequestParam(defaultValue = "10") limit: Long = 10,
    ): ResponseEntity<List<SearchRankingItem>> {
        if (limit < 1) {
            return ResponseEntity.badRequest().build()
        }

        // 컨트롤러는 HTTP 요청을 서비스 호출로 바꾸는 얇은 진입점이다.
        // limit처럼 HTTP 요청 파라미터 자체가 잘못된 값은 여기서 400으로 막는다.
        // Redis ZSET을 어떻게 읽는지는 SearchRankingService에 숨기고,
        // 프론트는 "상위 검색어 목록"이라는 API 계약만 알면 된다.
        return ResponseEntity.ok(searchRankingService.getTopKeywords(limit))
    }

    @GetMapping("/sources")
    fun getTopSources(
        @RequestParam(defaultValue = "4") limit: Long = 4,
    ): ResponseEntity<List<SearchSourceRankingItem>> {
        if (limit < 1) {
            return ResponseEntity.badRequest().build()
        }

        // source 순위는 검색어 자체가 아니라 "검색 결과로 들어온 경로"를 집계한다.
        // 키워드 랭킹과 같은 Redis ZSET 조회 패턴이지만, 응답에는 학습용 label/description을 함께 담는다.
        return ResponseEntity.ok(searchRankingService.getTopSources(limit))
    }

    @GetMapping("/suggestions")
    fun suggestKeywords(
        @RequestParam keyword: String,
        @RequestParam(defaultValue = "5") limit: Long = 5,
    ): ResponseEntity<List<SearchKeywordSuggestionItem>> {
        if (keyword.isBlank() || limit < 1) {
            return ResponseEntity.badRequest().build()
        }

        // 추천어는 사용자가 검색창에 입력 중인 prefix를 기반으로 랭킹 데이터를 좁힌 결과다.
        // 컨트롤러는 HTTP 파라미터 검증만 하고, 정규화와 ZSET 필터링은 서비스에 맡긴다.
        return ResponseEntity.ok(searchRankingService.suggest(rawKeyword = keyword, limit = limit))
    }

    @PostMapping
    fun recordKeyword(
        @RequestBody request: SearchKeywordRecordRequest,
    ): ResponseEntity<Void> {
        if (request.keyword.isBlank()) {
            return ResponseEntity.badRequest().build()
        }

        // 검색어 정규화와 Redis 점수 증가는 서비스 책임으로 둔다.
        // 컨트롤러는 HTTP body에서 넘어온 keyword를 서비스에 전달하는 얇은 어댑터다.
        // 다만 빈 검색어처럼 HTTP body 자체가 잘못된 값이면 여기서 400으로 막는다.
        searchRankingService.record(request.keyword)
        return ResponseEntity.noContent().build()
    }
}
