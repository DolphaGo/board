package dev.dolphago.search

import org.springframework.data.annotation.Id
import org.springframework.data.elasticsearch.annotations.Document
import org.springframework.data.elasticsearch.annotations.Field
import org.springframework.data.elasticsearch.annotations.FieldType

@Document(indexName = "board-posts")
data class PostSearchDocument(
    @Id
    val id: Long? = null,

    // nori는 Elasticsearch의 한국어 형태소 분석기다.
    // 실제 인덱스 템플릿에도 같은 analyzer가 있어야 한글 음절/형태소 검색 품질을 맞출 수 있다.
    @Field(type = FieldType.Text, analyzer = "nori")
    val title: String = "",

    @Field(type = FieldType.Text, analyzer = "nori")
    val content: String = "",

    @Field(type = FieldType.Long)
    val viewCount: Long = 0,

    @Field(type = FieldType.Boolean)
    val display: Boolean = true
)
