import axios from 'axios'

const STUDY_MEMBER_ID = 1

export interface CreatePostPayload {
  title: string
  content: string
}

export interface PostResponse {
  id: number
  title: string
  content: string
  viewCount: number
  display: boolean
}

export interface PostListItemResponse extends PostResponse {
  authorNickname: string
  createdAt: string
  commentCount: number
  recommendCount: number
}

const isPostResponse = (data: unknown): data is PostResponse => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const post = data as Partial<PostResponse>
  return typeof post.id === 'number' &&
    typeof post.title === 'string' &&
    typeof post.content === 'string' &&
    typeof post.viewCount === 'number' &&
    typeof post.display === 'boolean'
}

const isPostListItemResponse = (data: unknown): data is PostListItemResponse => {
  if (!isPostResponse(data)) {
    return false
  }

  const post = data as Partial<PostListItemResponse>
  return typeof post.authorNickname === 'string' &&
    typeof post.createdAt === 'string' &&
    typeof post.commentCount === 'number' &&
    typeof post.recommendCount === 'number'
}

export const postService = {
  getPost: async (id: number): Promise<PostResponse> => {
    const response = await axios.get<PostResponse>(`/api/posts/${id}`)

    if (!isPostResponse(response.data)) {
      throw new Error('Invalid post response')
    }

    return response.data
  },

  listPosts: async (): Promise<PostListItemResponse[]> => {
    const response = await axios.get<PostListItemResponse[]>('/api/posts')

    // 백엔드가 꺼진 Vite 단독 실행에서는 index.html 문자열이 내려올 수 있다.
    // 목록 화면은 배열 DTO만 렌더링하도록 경계에서 계약을 확인한다.
    if (!Array.isArray(response.data) || !response.data.every(isPostListItemResponse)) {
      throw new Error('Invalid post list response')
    }

    return response.data
  },

  createPost: async (payload: CreatePostPayload): Promise<PostResponse> => {
    const response = await axios.post<PostResponse>('/api/posts', {
      // 공부용 MVP라 로그인 기능과 연결하기 전까지는 고정 학습 계정으로 요청한다.
      // 이후 Kakao 로그인과 회원 세션이 붙으면 이 값은 로그인 사용자 id로 교체한다.
      memberId: STUDY_MEMBER_ID,
      title: payload.title,
      content: payload.content,
    })

    if (!isPostResponse(response.data)) {
      throw new Error('Invalid post response')
    }

    return response.data
  },
}
