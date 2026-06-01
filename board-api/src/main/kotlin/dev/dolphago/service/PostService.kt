package dev.dolphago.service

import dev.dolphago.comment.repository.CommentRepository
import dev.dolphago.member.repository.MemberRepository
import dev.dolphago.mysql.Post
import dev.dolphago.post.repository.PostRepository
import dev.dolphago.recommend.repository.PostRecommendRepository
import dev.dolphago.search.PostSearchIndexService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class PostService(
    private val postRepository: PostRepository,
    private val memberRepository: MemberRepository,
    private val commentRepository: CommentRepository,
    private val postRecommendRepository: PostRecommendRepository,
    private val postSearchIndexService: PostSearchIndexService,
) {
    fun getPost(postId: Long): Post {
        // 상세 조회는 MySQL의 원본 게시글을 읽는다.
        // ES 문서는 검색 후보를 찾는 용도이고, 실제 본문 표시는 원본 저장소를 기준으로 한다.
        val post =
            postRepository.findById(postId).orElseThrow {
                IllegalArgumentException("게시글을 찾을 수 없습니다: $postId")
            }

        // 목록/검색 노출만으로 조회수를 올리면 스코어링 학습 데이터가 쉽게 오염된다.
        // 상세 API를 통해 본문을 읽을 때만 1 증가시키는 규칙을 서비스에 둔다.
        post.increaseViewCount()

        return post
    }

    fun listPosts(): List<PostListItem> {
        // 목록은 게시판 첫 화면을 빠르게 그리는 용도다.
        // 상세 조회와 달리 "읽었다"는 사용자 행위가 아니므로 조회수를 올리지 않는다.
        return postRepository.findByDisplayTrueOrderByIdDesc().map { post ->
            PostListItem(
                post = post,
                // 댓글은 display=true인 것만 사용자에게 노출된다.
                // 목록 댓글 수 역시 실제로 보이는 댓글 기준으로 맞춰야 UX와 DB 상태가 어긋나지 않는다.
                commentCount = post.id?.let(commentRepository::countByPostIdAndDisplayTrue) ?: 0,
                // 추천 취소/숨김이 가능하도록 display=true인 추천만 목록 수치에 포함한다.
                recommendCount = post.id?.let(postRecommendRepository::countByPostIdAndDisplayTrue) ?: 0,
            )
        }
    }

    fun createPost(
        memberId: Long,
        title: String,
        content: String,
    ): Post {
        val member =
            memberRepository.findById(memberId).orElseThrow {
                IllegalArgumentException("사용자를 찾을 수 없습니다: $memberId")
            }
        val post =
            Post(
                member = member,
                title = title,
                content = content,
                viewCount = 0,
                display = true,
            )
        val savedPost = postRepository.save(post)

        // 게시글 저장소(MySQL)가 원본이고, ES는 검색 전용 복제본이다.
        // 그래서 먼저 DB 저장을 끝낸 뒤 저장된 id를 포함한 문서를 색인한다.
        postSearchIndexService.index(savedPost)

        return savedPost
    }
}

data class PostListItem(
    val post: Post,
    val commentCount: Long,
    val recommendCount: Long,
)
