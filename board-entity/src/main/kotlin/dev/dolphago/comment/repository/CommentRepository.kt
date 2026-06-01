package dev.dolphago.comment.repository

import dev.dolphago.mysql.Comment
import org.springframework.data.jpa.repository.JpaRepository

interface CommentRepository : JpaRepository<Comment, Long> {
    fun countByPostIdAndDisplayTrue(postId: Long): Long

    fun findByPostIdAndDisplayTrueOrderByIdAsc(postId: Long): List<Comment>
}
