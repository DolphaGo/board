package dev.dolphago.search

import dev.dolphago.mysql.Post
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.elasticsearch.core.ElasticsearchOperations
import org.springframework.stereotype.Service

@Service
class PostSearchIndexService(
    private val elasticsearchOperations: ElasticsearchOperations,
    @param:Value("\${board.search.indexing-enabled:true}")
    private val indexingEnabled: Boolean = true,
) {
    fun index(post: Post): PostSearchDocument {
        val document =
            PostSearchDocument(
                id = post.id,
                title = post.title,
                content = post.content,
                titleSyllables = KoreanSyllableTokenizer.tokenize(post.title),
                contentSyllables = KoreanSyllableTokenizer.tokenize(post.content),
                titleInitials = KoreanSyllableTokenizer.tokenizeInitials(post.title),
                contentInitials = KoreanSyllableTokenizer.tokenizeInitials(post.content),
                viewCount = post.viewCount,
                display = post.display,
                notice = post.notice,
            )

        // RDB의 Post와 ES 문서는 저장소 목적이 다르다.
        // 검색 서버에는 검색과 스코어링에 필요한 값만 복사하고, 음절 토큰처럼 검색 전용 파생 필드는 여기서 만들어 색인한다.
        // 학습 프로필은 외부 검색 서버 없이 DB 저장을 연습하도록 색인을 명시적으로 끈다.
        if (!indexingEnabled) {
            return document
        }
        return elasticsearchOperations.save(document)
    }
}
