package dev.dolphago.controller

import dev.dolphago.mysql.Comment
import dev.dolphago.mysql.Post
import dev.dolphago.mysql.PostRecommend
import dev.dolphago.service.PostListItem
import dev.dolphago.service.PostService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDateTime

@RestController
@RequestMapping("/api/posts")
class PostController(
    private val postService: PostService,
) {
    @GetMapping
    fun listPosts(): ResponseEntity<List<PostListItemResponse>> =
        ResponseEntity.ok(postService.listPosts().map { it.toListItemResponse() })

    @GetMapping("/{id}")
    fun getPost(
        @PathVariable id: Long,
    ): ResponseEntity<PostResponse> = ResponseEntity.ok(postService.getPost(id).toResponse())

    @GetMapping("/{id}/comments")
    fun listComments(
        @PathVariable id: Long,
    ): ResponseEntity<List<CommentResponse>> {
        // 댓글 목록은 상세 화면에서 본문 아래에 붙는 읽기 전용 데이터다.
        // 컨트롤러에서는 서비스가 고른 노출 댓글을 화면 DTO로만 변환한다.
        return ResponseEntity.ok(postService.listComments(postId = id).map { it.toResponse() })
    }

    @PostMapping
    fun createPost(
        @RequestBody request: CreatePostRequest,
    ): ResponseEntity<PostResponse> {
        // 컨트롤러는 HTTP 요청을 서비스 호출로 옮기는 얇은 진입점이다.
        // DB 저장과 ES 색인 순서는 PostService가 책임져야 다른 진입점에서도 재사용할 수 있다.
        val post =
            postService.createPost(
                memberId = request.memberId,
                title = request.title,
                content = request.content,
                imageUrls = request.imageUrls,
                notice = request.notice,
            )

        return ResponseEntity.ok(post.toResponse())
    }

    @PostMapping("/{id}/comments")
    fun createComment(
        @PathVariable id: Long,
        @RequestBody request: CreateCommentRequest,
    ): ResponseEntity<CommentResponse> {
        // 댓글 작성도 목록 메타 집계의 입력 데이터다.
        // 컨트롤러는 요청 값을 서비스로 넘기고, 저장된 댓글을 응답 DTO로 바꾸는 역할만 한다.
        val comment =
            postService.createComment(
                postId = id,
                memberId = request.memberId,
                content = request.content,
            )

        return ResponseEntity.ok(comment.toResponse())
    }

    @PostMapping("/{id}/recommends")
    fun createRecommend(
        @PathVariable id: Long,
        @RequestBody request: CreateRecommendRequest,
    ): ResponseEntity<PostRecommendResponse> {
        // 추천 작성은 추천 수 집계의 입력 데이터다.
        // 중복 추천 방지 같은 정책은 서비스/저장소 규칙으로 확정된 뒤 별도 테스트로 추가한다.
        val recommend =
            postService.createRecommend(
                postId = id,
                memberId = request.memberId,
            )

        return ResponseEntity.ok(recommend.toResponse())
    }
}

data class CreatePostRequest(
    val memberId: Long,
    val title: String,
    val content: String,
    val imageUrls: List<String> = emptyList(),
    val notice: Boolean = false,
)

data class CreateCommentRequest(
    val memberId: Long,
    val content: String,
)

data class CreateRecommendRequest(
    val memberId: Long,
)

data class PostResponse(
    val id: Long?,
    val title: String,
    val content: String,
    val imageUrls: List<String>,
    val viewCount: Long,
    val display: Boolean,
    val notice: Boolean,
)

data class PostListItemResponse(
    val id: Long?,
    val title: String,
    val content: String,
    val imageUrls: List<String>,
    val viewCount: Long,
    val display: Boolean,
    val notice: Boolean,
    val authorNickname: String,
    val createdAt: LocalDateTime,
    val commentCount: Long,
    val recommendCount: Long,
)

data class CommentResponse(
    val id: Long?,
    val postId: Long?,
    val memberId: Long?,
    val authorNickname: String,
    val content: String,
    val display: Boolean,
    val createdAt: LocalDateTime,
)

data class PostRecommendResponse(
    val id: Long?,
    val postId: Long?,
    val memberId: Long?,
    val display: Boolean,
    val createdAt: LocalDateTime,
)

private fun Post.toResponse(): PostResponse =
    PostResponse(
        id = id,
        title = title,
        content = content,
        imageUrls = imageUrls,
        viewCount = viewCount,
        display = display,
        notice = notice,
    )

private fun PostListItem.toListItemResponse(): PostListItemResponse =
    PostListItemResponse(
        id = post.id,
        title = post.title,
        content = post.content,
        imageUrls = post.imageUrls,
        viewCount = post.viewCount,
        display = post.display,
        notice = post.notice,
        authorNickname = post.member.nickname,
        createdAt = post.createDate,
        commentCount = commentCount,
        recommendCount = recommendCount,
    )

private fun Comment.toResponse(): CommentResponse =
    CommentResponse(
        id = id,
        postId = post.id,
        memberId = member.id,
        authorNickname = member.nickname,
        content = content,
        display = display,
        createdAt = createDate,
    )

private fun PostRecommend.toResponse(): PostRecommendResponse =
    PostRecommendResponse(
        id = id,
        postId = post.id,
        memberId = member.id,
        display = display,
        createdAt = createDate,
    )
