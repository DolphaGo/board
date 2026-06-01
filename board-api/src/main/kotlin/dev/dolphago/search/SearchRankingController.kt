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
        // 컨트롤러는 HTTP 요청을 서비스 호출로 바꾸는 얇은 진입점이다.
        // Redis ZSET을 어떻게 읽는지는 SearchRankingService에 숨기고,
        // 프론트는 "상위 검색어 목록"이라는 API 계약만 알면 된다.
        return ResponseEntity.ok(searchRankingService.getTopKeywords(limit))
    }

    @PostMapping
    fun recordKeyword(
        @RequestBody request: SearchKeywordRecordRequest,
    ): ResponseEntity<Void> {
        // 검색어 정규화와 Redis 점수 증가는 서비스 책임으로 둔다.
        // 컨트롤러는 HTTP body에서 넘어온 keyword를 서비스에 전달하는 얇은 어댑터다.
        searchRankingService.record(request.keyword)
        return ResponseEntity.noContent().build()
    }
}
