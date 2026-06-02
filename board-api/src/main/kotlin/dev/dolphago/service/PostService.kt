package dev.dolphago.service

import dev.dolphago.comment.repository.CommentRepository
import dev.dolphago.member.repository.MemberRepository
import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Comment
import dev.dolphago.mysql.Post
import dev.dolphago.mysql.PostRecommend
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

    fun getPostDetail(postId: Long): PostDetailItem {
        val post = getPost(postId)
        val resolvedPostId = post.id ?: postId

        // 상세 화면의 댓글/추천 수는 목록과 같은 display=true 기준을 쓴다.
        // 본문과 메타 수치가 같은 저장소 기준으로 묶여야 목록에서 들어온 사용자가 다른 숫자를 보지 않는다.
        return PostDetailItem(
            post = post,
            commentCount = commentRepository.countByPostIdAndDisplayTrue(resolvedPostId),
            recommendCount = postRecommendRepository.countByPostIdAndDisplayTrue(resolvedPostId),
        )
    }

    fun listPosts(): List<PostListItem> {
        // 목록은 게시판 첫 화면을 빠르게 그리는 용도다.
        // 상세 조회와 달리 "읽었다"는 사용자 행위가 아니므로 조회수를 올리지 않는다.
        // 공지글은 일반 글보다 운영상 우선 노출되어야 하므로 notice desc로 먼저 묶고,
        // 같은 그룹 안에서는 id desc를 써서 최신 글이 위로 오게 한다.
        return postRepository.findByDisplayTrueOrderByNoticeDescIdDesc().map { post ->
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

    fun listNoticePosts(): List<PostListItem> {
        // 공지사항 탭은 일반 목록과 달리 notice=true인 운영 글만 보여준다.
        // display=true 조건을 Repository 메서드 이름에 같이 둬서 숨김 처리된 공지가 사용자 화면에 새지 않게 한다.
        return postRepository.findByDisplayTrueAndNoticeTrueOrderByIdDesc().map { post ->
            PostListItem(
                post = post,
                // 공지 화면에서도 목록과 같은 메타 기준을 쓴다.
                // 댓글/추천 수 기준이 다르면 같은 게시글이 화면마다 다른 수치를 보여 학습용 예제가 헷갈린다.
                commentCount = post.id?.let(commentRepository::countByPostIdAndDisplayTrue) ?: 0,
                recommendCount = post.id?.let(postRecommendRepository::countByPostIdAndDisplayTrue) ?: 0,
            )
        }
    }

    fun listHiddenPosts(actorMemberId: Long): List<PostListItem> {
        val actor =
            memberRepository.findById(actorMemberId).orElseThrow {
                IllegalArgumentException("사용자를 찾을 수 없습니다: $actorMemberId")
            }

        if (actor.role != Authority.ROLE_ADMIN) {
            // 숨김 목록은 운영자가 복구 대상을 찾기 위한 관리 데이터다.
            // 일반 사용자 목록과 분리해서 관리자 권한이 있을 때만 원본 숨김 글을 노출한다.
            throw IllegalArgumentException("숨김 게시글 목록은 관리자만 조회할 수 있습니다.")
        }

        return postRepository.findByDisplayFalseOrderByIdDesc().map { post ->
            PostListItem(
                post = post,
                // 숨김 글의 관리 목록에서도 댓글/추천 수는 실제 노출 중인 보조 데이터 기준으로 보여준다.
                // 이렇게 해야 복구했을 때 사용자 목록의 메타 수치와 같은 기준을 유지한다.
                commentCount = post.id?.let(commentRepository::countByPostIdAndDisplayTrue) ?: 0,
                recommendCount = post.id?.let(postRecommendRepository::countByPostIdAndDisplayTrue) ?: 0,
            )
        }
    }

    fun listComments(postId: Long): List<Comment> {
        // 댓글 목록은 상세 화면의 보조 데이터이므로 게시글 조회수에 영향을 주지 않는다.
        // 삭제/숨김 처리된 댓글은 display=false로 남기고, 사용자 화면에는 노출 댓글만 오래된 순으로 보여준다.
        return commentRepository.findByPostIdAndDisplayTrueOrderByIdAsc(postId)
    }

    fun createPost(
        memberId: Long,
        title: String,
        content: String,
        imageUrls: List<String> = emptyList(),
        notice: Boolean = false,
    ): Post {
        val member =
            memberRepository.findById(memberId).orElseThrow {
                IllegalArgumentException("사용자를 찾을 수 없습니다: $memberId")
            }
        if (notice && member.role != Authority.ROLE_ADMIN) {
            // 공지글은 일반 글보다 강한 노출 권한을 갖는 게시판 운영 데이터다.
            // 그래서 요청자가 notice=true를 보냈더라도 관리자 권한이 아니면 저장/색인 전에 차단한다.
            throw IllegalArgumentException("공지 게시글은 관리자만 작성할 수 있습니다.")
        }
        val post =
            Post(
                member = member,
                title = title,
                content = content,
                // 샘플에서는 이미지 파일 자체가 아니라 본문에 이어붙일 이미지 URL 목록을 먼저 저장한다.
                // 실제 서비스라면 이 지점에서 업로드 파일 소유권, 확장자, CDN URL 같은 검증이 추가된다.
                imageUrls = imageUrls.map(String::trim).filter(String::isNotBlank),
                viewCount = 0,
                display = true,
                notice = notice,
            )
        val savedPost = postRepository.save(post)

        // 게시글 저장소(MySQL)가 원본이고, ES는 검색 전용 복제본이다.
        // 그래서 먼저 DB 저장을 끝낸 뒤 저장된 id를 포함한 문서를 색인한다.
        postSearchIndexService.index(savedPost)

        return savedPost
    }

    fun createComment(
        postId: Long,
        memberId: Long,
        content: String,
    ): Comment {
        val post =
            postRepository.findById(postId).orElseThrow {
                IllegalArgumentException("게시글을 찾을 수 없습니다: $postId")
            }
        val member =
            memberRepository.findById(memberId).orElseThrow {
                IllegalArgumentException("사용자를 찾을 수 없습니다: $memberId")
            }

        // 댓글은 게시글 원본 DB에 달리는 사용자 액션이다.
        // 목록의 commentCount는 CommentRepository 집계를 읽으므로 저장 직후 다음 목록 조회부터 반영된다.
        return commentRepository.save(
            Comment(
                post = post,
                member = member,
                content = content,
                display = true,
            ),
        )
    }

    fun hidePost(
        postId: Long,
        actorMemberId: Long,
    ): Post {
        val actor =
            memberRepository.findById(actorMemberId).orElseThrow {
                IllegalArgumentException("사용자를 찾을 수 없습니다: $actorMemberId")
            }

        if (actor.role != Authority.ROLE_ADMIN) {
            // 숨김 처리는 게시판 운영 액션이다.
            // 작성자 본인의 삭제 기능과 달리 목록/검색 노출 정책을 바꾸므로 관리자 권한으로 제한한다.
            throw IllegalArgumentException("게시글 숨김은 관리자만 할 수 있습니다.")
        }

        val post =
            postRepository.findById(postId).orElseThrow {
                IllegalArgumentException("게시글을 찾을 수 없습니다: $postId")
            }

        post.hide()

        // 검색은 display=true만 노출하므로, 숨김 직후 ES 문서도 다시 색인해 검색 결과에서 제외한다.
        postSearchIndexService.index(post)

        return post
    }

    fun restorePost(
        postId: Long,
        actorMemberId: Long,
    ): Post {
        val actor =
            memberRepository.findById(actorMemberId).orElseThrow {
                IllegalArgumentException("사용자를 찾을 수 없습니다: $actorMemberId")
            }

        if (actor.role != Authority.ROLE_ADMIN) {
            // 복구도 목록/검색 노출 정책을 바꾸는 운영 액션이다.
            // 숨김과 같은 권한 경계로 묶어야 일반 사용자가 임의로 노출 상태를 바꾸지 못한다.
            throw IllegalArgumentException("게시글 복구는 관리자만 할 수 있습니다.")
        }

        val post =
            postRepository.findById(postId).orElseThrow {
                IllegalArgumentException("게시글을 찾을 수 없습니다: $postId")
            }

        post.restore()

        // 복구 직후 ES 문서를 다시 색인해야 display=true 필터를 통과해 검색 결과에 재노출된다.
        postSearchIndexService.index(post)

        return post
    }

    fun createRecommend(
        postId: Long,
        memberId: Long,
    ): PostRecommend {
        val existingRecommend = postRecommendRepository.findByPostIdAndMemberIdAndDisplayTrue(postId, memberId)

        if (existingRecommend != null) {
            // 추천 버튼은 더블클릭이나 네트워크 재시도로 같은 요청이 반복될 수 있다.
            // 이미 노출 중인 추천이 있으면 새 row를 만들지 않고 기존 추천을 돌려줘 추천 수가 부풀지 않게 한다.
            return existingRecommend
        }

        val post =
            postRepository.findById(postId).orElseThrow {
                IllegalArgumentException("게시글을 찾을 수 없습니다: $postId")
            }
        val member =
            memberRepository.findById(memberId).orElseThrow {
                IllegalArgumentException("사용자를 찾을 수 없습니다: $memberId")
            }

        // 추천은 게시글에 대한 가벼운 사용자 액션이다.
        // 목록의 recommendCount는 display=true 추천만 세므로 새 추천도 기본 노출 상태로 저장한다.
        return postRecommendRepository.save(
            PostRecommend(
                post = post,
                member = member,
                display = true,
            ),
        )
    }
}

data class PostListItem(
    val post: Post,
    val commentCount: Long,
    val recommendCount: Long,
)

data class PostDetailItem(
    val post: Post,
    val commentCount: Long,
    val recommendCount: Long,
)
