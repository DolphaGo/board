package dev.dolphago.mysql

import jakarta.persistence.Column
import jakarta.persistence.Convert
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "post")
data class Post(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    var id: Long? = null,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    val member: Member,
    @Column(name = "title", nullable = false)
    val title: String,
    @Column(name = "content", nullable = false)
    val content: String,
    @Column(name = "image_urls", nullable = false, columnDefinition = "TEXT")
    @Convert(converter = PostImageUrlsConverter::class)
    val imageUrls: List<String> = emptyList(),
    var viewCount: Long,
    var display: Boolean,
    @Column(name = "notice", nullable = false)
    val notice: Boolean = false,
) : EntityListener() {
    fun increaseViewCount() {
        // 상세 조회처럼 "게시글을 실제로 읽은 행위"가 있을 때만 조회수를 올린다.
        // JPA 변경 감지가 이 값을 UPDATE 하므로 서비스는 별도 save 호출 없이 의도를 표현한다.
        viewCount += 1
    }

    fun hide() {
        // 게시판에서는 물리 삭제보다 숨김 처리가 운영에 유리한 경우가 많다.
        // 댓글/추천/검색 색인 이력을 보존하면서 목록과 검색에서만 제외할 수 있기 때문이다.
        display = false
    }
}
