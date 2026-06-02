import type { CommentResponse, PostResponse } from './postService'

type LocalPostRequestPath =
  | { kind: 'post'; postId: number }
  | { kind: 'comments'; postId: number }

const LOCAL_POST_ID = 999

const parsePostId = (value: string | undefined): number => {
  const postId = Number(value)

  return Number.isInteger(postId) && postId > 0 ? postId : LOCAL_POST_ID
}

export const parseLocalPostRequestPath = (requestPath: string): LocalPostRequestPath => {
  const pathname = requestPath.split('?')[0] ?? ''
  const parts = pathname.replace(/^\/+/, '').split('/').filter(part => part.length > 0)
  const postId = parsePostId(parts[0])

  if (parts[1] === 'comments') {
    return {
      kind: 'comments',
      postId,
    }
  }

  return {
    kind: 'post',
    postId,
  }
}

export const createLocalPostFixture = (postId: number = LOCAL_POST_ID): PostResponse => ({
  id: postId,
  title: `local fixture post #${postId}`,
  content: 'created by vite fixture',
  imageUrls: [],
  viewCount: 0,
  display: true,
  notice: false,
  // Vite만 띄운 학습 모드에서도 postService의 DTO 검증을 그대로 통과하게 실제 상세 응답 필드를 맞춘다.
  // 이렇게 해야 백엔드 없이도 "작성 -> 상세 이동 -> 댓글 영역" 흐름을 프론트에서 반복 검증할 수 있다.
  authorNickname: '로컬 학습유저',
  createdAt: '2026-06-02T00:00:00',
  commentCount: 0,
  recommendCount: 0,
})

export const createLocalPostCommentsFixture = (): CommentResponse[] => []
