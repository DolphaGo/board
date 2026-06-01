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
    // nori가 형태소 단위 관련도를 맡고, syllables 필드는 사용자가 "ㅋㅌㄹ"처럼 일부 소리만 떠올릴 때의 보조 신호로 쓴다.
    // 원문 점수를 이기지 않게 검색 쿼리에서 낮은 boost를 주는 것이 핵심이다.
    @Field(type = FieldType.Text)
    val titleSyllables: String = "",
    @Field(type = FieldType.Text)
    val contentSyllables: String = "",
    // initials 필드는 "ㅋㅌㄹ", "ㄱㅅ"처럼 초성만 입력한 사용자를 위한 별도 recall 필드다.
    // syllables 필드와 섞으면 초성/중성/종성 점수 해석이 흐려지므로 분리해서 boost를 따로 조절한다.
    @Field(type = FieldType.Text)
    val titleInitials: String = "",
    @Field(type = FieldType.Text)
    val contentInitials: String = "",
    @Field(type = FieldType.Long)
    val viewCount: Long = 0,
    @Field(type = FieldType.Boolean)
    val display: Boolean = true,
    @Field(type = FieldType.Boolean)
    val notice: Boolean = false,
)
