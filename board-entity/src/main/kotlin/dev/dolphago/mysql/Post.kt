package dev.dolphago.mysql

import jakarta.persistence.Column
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
    val member: Member, // 작성자

    @Column(name = "title", nullable = false)
    val title: String, // 제목

    @Column(name = "content", nullable = false)
    val content: String, // 내용

    var viewCount: Long, // 조회 수

    val display: Boolean // 노출 여부
) : EntityListener() {
    fun increaseViewCount() {
        // 상세 조회처럼 "게시글을 실제로 읽은 행위"가 있을 때만 조회수를 올린다.
        // JPA 변경 감지가 이 값을 UPDATE 하므로 서비스는 별도 save 호출 없이 의도를 표현한다.
        viewCount += 1
    }
}
