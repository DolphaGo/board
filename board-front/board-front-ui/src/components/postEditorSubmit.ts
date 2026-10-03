import type { CreatePostPayload, PostResponse, StudyActorRole } from 'src/api/postService'

interface SubmitPostEditorFormOptions {
  title: string
  content: string
  imageUrls?: string[]
  notice?: boolean
  actorRole?: StudyActorRole
  createPost: (payload: CreatePostPayload) => Promise<PostResponse>
  moveToPostDetail: (postId: number) => void
}

export const submitPostEditorForm = async ({
  title,
  content,
  imageUrls = [],
  notice = false,
  actorRole = 'user',
  createPost,
  moveToPostDetail,
}: SubmitPostEditorFormOptions): Promise<string> => {
  // 프론트 검증은 빠른 입력 피드백이다. 직접 API 요청도 같은 규칙으로 서버에서 검증한다.
  if (title.trim().length === 0) return '제목을 입력해 주세요.'
  if (title.length > 255) return '제목은 255자 이내로 입력해 주세요.'
  if (content.trim().length === 0) return '본문을 입력해 주세요.'

  const payload: CreatePostPayload = {
    title,
    content,
    imageUrls,
    actorRole,
  }

  if (notice) {
    payload.notice = true
  }

  const post = await createPost(payload)

  // 저장 성공 후 상세 화면으로 이동해야 사용자가 방금 쓴 글을 바로 확인할 수 있다.
  // 이동 동작은 콜백으로 받아 테스트에서는 router 없이도 흐름을 검증한다.
  moveToPostDetail(post.id)

  return `게시글 #${post.id} 저장 완료`
}
