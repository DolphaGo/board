package dev.dolphago.search

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/search/posts")
class PostSearchController(
    private val postSearchService: PostSearchService,
    private val searchRankingService: SearchRankingService,
) {
    @GetMapping
    fun search(
        @RequestParam keyword: String,
        @RequestParam(defaultValue = "20") size: Int = 20,
        @RequestParam(defaultValue = "direct") source: String = SearchRankingSource.DIRECT.value,
    ): ResponseEntity<List<PostSearchResult>> {
        // 컨트롤러는 HTTP 파라미터를 검색 서비스 호출로 옮기는 진입점이다.
        // 검색어 정규화, boost, display 필터 같은 검색 정책은 서비스에 모은다.
        val results = postSearchService.search(keyword, size)

        // 프론트 헤더뿐 아니라 API를 직접 호출한 검색도 랭킹에 반영한다.
        // 정규화 규칙은 SearchRankingService가 SearchKeyword를 통해 처리하므로 원문 keyword를 전달한다.
        // source는 header/suggestion/ranking/direct 같은 유입 경로 집계용 값이고, 알 수 없는 값은 서비스에서 direct로 접는다.
        searchRankingService.record(keyword, source)

        return ResponseEntity.ok(results)
    }

    @GetMapping("/{postId}/related")
    fun recommendRelated(
        @PathVariable postId: Long,
        @RequestParam(defaultValue = "3") size: Int = 3,
    ): ResponseEntity<List<PostSearchResult>> {
        // 관련 글 추천은 사용자가 명시적으로 검색창에 입력한 키워드가 아니다.
        // 그래서 실시간 검색어 랭킹에는 기록하지 않고, 검색 스코어링을 재사용한 추천 결과만 반환한다.
        return ResponseEntity.ok(
            postSearchService.recommendRelated(
                currentPostId = postId,
                size = size,
            ),
        )
    }
}
