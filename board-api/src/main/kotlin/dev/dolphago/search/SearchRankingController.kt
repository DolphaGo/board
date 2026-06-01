package dev.dolphago.search

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/search/rankings")
class SearchRankingController(
    private val searchRankingService: SearchRankingService
) {
    @GetMapping
    fun getTopKeywords(
        @RequestParam(defaultValue = "10") limit: Long = 10
    ): ResponseEntity<List<SearchRankingItem>> {
        // 컨트롤러는 HTTP 요청을 서비스 호출로 바꾸는 얇은 진입점이다.
        // Redis ZSET을 어떻게 읽는지는 SearchRankingService에 숨기고,
        // 프론트는 "상위 검색어 목록"이라는 API 계약만 알면 된다.
        return ResponseEntity.ok(searchRankingService.getTopKeywords(limit))
    }
}
