package dev.dolphago.search

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/search/posts")
class PostSearchController(
    private val postSearchService: PostSearchService
) {
    @GetMapping
    fun search(
        @RequestParam keyword: String,
        @RequestParam(defaultValue = "20") size: Int = 20
    ): ResponseEntity<List<PostSearchResult>> {
        // 컨트롤러는 HTTP 파라미터를 검색 서비스 호출로 옮기는 진입점이다.
        // 검색어 정규화, boost, display 필터 같은 검색 정책은 서비스에 모은다.
        return ResponseEntity.ok(postSearchService.search(keyword, size))
    }
}
