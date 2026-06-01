package dev.dolphago.controller

import dev.dolphago.mysql.Comment
import dev.dolphago.mysql.Post
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
}

data class CreatePostRequest(
    val memberId: Long,
    val title: String,
    val content: String,
)

data class CreateCommentRequest(
    val memberId: Long,
    val content: String,
)

data class PostResponse(
    val id: Long?,
    val title: String,
    val content: String,
    val viewCount: Long,
    val display: Boolean,
)

data class PostListItemResponse(
    val id: Long?,
    val title: String,
    val content: String,
    val viewCount: Long,
    val display: Boolean,
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

private fun Post.toResponse(): PostResponse =
    PostResponse(
        id = id,
        title = title,
        content = content,
        viewCount = viewCount,
        display = display,
    )

private fun PostListItem.toListItemResponse(): PostListItemResponse =
    PostListItemResponse(
        id = post.id,
        title = post.title,
        content = post.content,
        viewCount = post.viewCount,
        display = post.display,
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
