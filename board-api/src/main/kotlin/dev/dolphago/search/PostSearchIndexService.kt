package dev.dolphago.search

import dev.dolphago.mysql.Post
import org.springframework.data.elasticsearch.core.ElasticsearchOperations
import org.springframework.stereotype.Service

@Service
class PostSearchIndexService(
    private val elasticsearchOperations: ElasticsearchOperations,
) {
    fun index(post: Post): PostSearchDocument {
        val document =
            PostSearchDocument(
                id = post.id,
                title = post.title,
                content = post.content,
                viewCount = post.viewCount,
                display = post.display,
            )

        // RDB의 Post와 ES 문서는 저장소 목적이 다르다.
        // 검색 서버에는 검색과 스코어링에 필요한 값만 복사해서 색인한다.
        return elasticsearchOperations.save(document)
    }
}
