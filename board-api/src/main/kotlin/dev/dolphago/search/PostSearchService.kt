package dev.dolphago.search

import org.springframework.data.domain.PageRequest
import org.springframework.data.elasticsearch.client.elc.NativeQuery
import org.springframework.data.elasticsearch.core.ElasticsearchOperations
import org.springframework.stereotype.Service

data class PostSearchResult(
    val postId: Long,
    val title: String,
    val contentPreview: String,
    val score: Float,
    val highlights: Map<String, List<String>>,
)

@Service
class PostSearchService(
    private val elasticsearchOperations: ElasticsearchOperations,
) {
    fun search(
        rawKeyword: String,
        size: Int,
    ): List<PostSearchResult> {
        val keyword = SearchKeyword.from(rawKeyword)
        val safeSize = size.coerceIn(1, MAX_SEARCH_SIZE)
        val query =
            NativeQuery
                .builder()
                .withQuery { q ->
                    q.bool { b ->
                        b
                            // 제목 일치는 게시판 검색에서 의도가 강하므로 본문보다 높은 boost를 둔다.
                            .should { s ->
                                s.match { m ->
                                    m
                                        .field("title")
                                        .query(keyword.value)
                                        .boost(3.0f)
                                }
                            }
                            // 본문 일치는 recall을 넓히는 용도다. 제목보다 낮은 기본 점수를 준다.
                            .should { s ->
                                s.match { m ->
                                    m
                                        .field("content")
                                        .query(keyword.value)
                                        .boost(1.0f)
                                }
                            }.filter { f ->
                                f.term { t ->
                                    t.field("display").value(true)
                                }
                            }.minimumShouldMatch("1")
                    }
                }.withPageable(PageRequest.of(0, safeSize))
                .build()

        return elasticsearchOperations
            .search(query, PostSearchDocument::class.java)
            .searchHits
            .mapNotNull { hit ->
                val document = hit.content
                val postId = document.id ?: return@mapNotNull null
                PostSearchResult(
                    postId = postId,
                    title = document.title,
                    contentPreview = document.content.take(CONTENT_PREVIEW_LENGTH),
                    score = hit.score,
                    highlights = hit.highlightFields,
                )
            }
    }

    companion object {
        private const val MAX_SEARCH_SIZE = 50
        private const val CONTENT_PREVIEW_LENGTH = 120
    }
}
