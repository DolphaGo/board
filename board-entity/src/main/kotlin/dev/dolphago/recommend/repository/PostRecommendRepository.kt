package dev.dolphago.recommend.repository

import dev.dolphago.mysql.PostRecommend
import org.springframework.data.jpa.repository.JpaRepository

interface PostRecommendRepository : JpaRepository<PostRecommend, Long> {
    fun countByPostIdAndDisplayTrue(postId: Long): Long

    fun findByPostIdAndMemberIdAndDisplayTrue(
        postId: Long,
        memberId: Long,
    ): PostRecommend?
}
