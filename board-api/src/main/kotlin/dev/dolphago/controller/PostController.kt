package dev.dolphago.controller

import dev.dolphago.mysql.Post
import dev.dolphago.service.PostService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/posts")
class PostController(
    private val postService: PostService
) {
    @GetMapping("/{id}")
    fun getPost(@PathVariable id: Long): ResponseEntity<PostResponse> =
        ResponseEntity.ok(postService.getPost(id).toResponse())

    @PostMapping
    fun createPost(@RequestBody request: CreatePostRequest): ResponseEntity<PostResponse> {
        // 컨트롤러는 HTTP 요청을 서비스 호출로 옮기는 얇은 진입점이다.
        // DB 저장과 ES 색인 순서는 PostService가 책임져야 다른 진입점에서도 재사용할 수 있다.
        val post = postService.createPost(
            memberId = request.memberId,
            title = request.title,
            content = request.content
        )

        return ResponseEntity.ok(post.toResponse())
    }
}

data class CreatePostRequest(
    val memberId: Long,
    val title: String,
    val content: String
)

data class PostResponse(
    val id: Long?,
    val title: String,
    val content: String,
    val viewCount: Long,
    val display: Boolean
)

private fun Post.toResponse(): PostResponse =
    PostResponse(
        id = id,
        title = title,
        content = content,
        viewCount = viewCount,
        display = display
    )
