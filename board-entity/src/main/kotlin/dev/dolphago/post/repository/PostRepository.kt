package dev.dolphago.post.repository

import dev.dolphago.mysql.Post
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository

interface PostRepository : JpaRepository<Post, Long> {
    fun findByDisplayTrueOrderByNoticeDescIdDesc(pageable: Pageable): Page<Post>

    fun findByDisplayTrueAndNoticeTrueOrderByIdDesc(): List<Post>

    fun findByDisplayFalseOrderByIdDesc(): List<Post>
}
