import type { CommentResponse, PostListItemResponse, PostListPageResponse, PostResponse } from './postService'

type LocalPostRequestPath =
  | { kind: 'list'; page: number; size: number }
  | { kind: 'notices' }
  | { kind: 'hidden' }
  | { kind: 'post'; postId: number }
  | { kind: 'comments'; postId: number }

const LOCAL_POST_ID = 999
const LOCAL_NOTICE_POST_ID = 998
const LOCAL_HIDDEN_POST_ID = 997

const parsePostId = (value: string | undefined): number => {
  const postId = Number(value)

  return Number.isInteger(postId) && postId > 0 ? postId : LOCAL_POST_ID
}

const parseNonNegativeInteger = (value: string | null, fallback: number): number => {
  const numberValue = Number(value)

  return Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : fallback
}

const parsePositiveInteger = (value: string | null, fallback: number): number => {
  const numberValue = Number(value)

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : fallback
}

export const parseLocalPostRequestPath = (requestPath: string): LocalPostRequestPath => {
  const url = new URL(requestPath, 'http://localhost')
  const pathname = url.pathname
  const parts = pathname.replace(/^\/+/, '').split('/').filter(part => part.length > 0)

  if (parts.length === 0) {
    return {
      kind: 'list',
      page: parseNonNegativeInteger(url.searchParams.get('page'), 0),
      size: parsePositiveInteger(url.searchParams.get('size'), 10),
    }
  }

  if (parts[0] === 'notices') {
    return {
      kind: 'notices',
    }
  }

  if (parts[0] === 'hidden') {
    return {
      kind: 'hidden',
    }
  }

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

const createLocalPostListItemFixture = (
  postId: number,
  overrides: Partial<PostListItemResponse> = {},
): PostListItemResponse => ({
  ...createLocalPostFixture(postId),
  authorNickname: '로컬 학습유저',
  createdAt: '2026-06-02T00:00:00',
  commentCount: 0,
  recommendCount: 0,
  ...overrides,
})

export const createLocalPostListPageFixture = ({
  page = 0,
  size = 10,
}: {
  page?: number
  size?: number
} = {}): PostListPageResponse => ({
  items: [
    createLocalPostListItemFixture(LOCAL_POST_ID),
  ],
  page,
  size,
  totalElements: 1,
  totalPages: 1,
})

export const createLocalNoticePostsFixture = (): PostListItemResponse[] => [
  createLocalPostListItemFixture(LOCAL_NOTICE_POST_ID, {
    title: 'local fixture notice',
    content: 'created by vite notice fixture',
    notice: true,
    authorNickname: '로컬 관리자',
  }),
]

export const createLocalHiddenPostsFixture = (): PostListItemResponse[] => [
  createLocalPostListItemFixture(LOCAL_HIDDEN_POST_ID, {
    title: 'local fixture hidden post',
    content: 'created by vite hidden fixture',
    display: false,
    authorNickname: '로컬 관리자',
  }),
]

export const createLocalPostCommentsFixture = (): CommentResponse[] => []
