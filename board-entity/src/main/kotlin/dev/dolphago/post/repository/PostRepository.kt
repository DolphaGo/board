package dev.dolphago.post.repository

import dev.dolphago.mysql.Post
import org.springframework.data.jpa.repository.JpaRepository

interface PostRepository : JpaRepository<Post, Long> {
    fun findByDisplayTrueOrderByNoticeDescIdDesc(): List<Post>

    fun findByDisplayFalseOrderByIdDesc(): List<Post>
}
