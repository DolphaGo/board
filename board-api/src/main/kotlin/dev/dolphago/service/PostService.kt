package dev.dolphago.service

import dev.dolphago.member.repository.MemberRepository
import dev.dolphago.mysql.Post
import dev.dolphago.post.repository.PostRepository
import dev.dolphago.search.PostSearchIndexService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class PostService(
    private val postRepository: PostRepository,
    private val memberRepository: MemberRepository,
    private val postSearchIndexService: PostSearchIndexService
) {
    fun createPost(memberId: Long, title: String, content: String): Post {
        val member = memberRepository.findById(memberId).orElseThrow {
            IllegalArgumentException("사용자를 찾을 수 없습니다: $memberId")
        }
        val post = Post(
            member = member,
            title = title,
            content = content,
            viewCount = 0,
            display = true
        )
        val savedPost = postRepository.save(post)

        // 게시글 저장소(MySQL)가 원본이고, ES는 검색 전용 복제본이다.
        // 그래서 먼저 DB 저장을 끝낸 뒤 저장된 id를 포함한 문서를 색인한다.
        postSearchIndexService.index(savedPost)

        return savedPost
    }
}
