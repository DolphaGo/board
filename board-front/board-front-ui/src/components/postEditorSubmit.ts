import type { CreatePostPayload, PostResponse } from 'src/api/postService'

interface SubmitPostEditorFormOptions {
  title: string
  content: string
  imageUrls?: string[]
  createPost: (payload: CreatePostPayload) => Promise<PostResponse>
  moveToPostDetail: (postId: number) => void
}

export const submitPostEditorForm = async ({
  title,
  content,
  imageUrls = [],
  createPost,
  moveToPostDetail,
}: SubmitPostEditorFormOptions): Promise<string> => {
  const post = await createPost({
    title,
    content,
    imageUrls,
  })

  // 저장 성공 후 상세 화면으로 이동해야 사용자가 방금 쓴 글을 바로 확인할 수 있다.
  // 이동 동작은 콜백으로 받아 테스트에서는 router 없이도 흐름을 검증한다.
  moveToPostDetail(post.id)

  return `게시글 #${post.id} 저장 완료`
}
