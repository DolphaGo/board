import axios from 'axios'

const STUDY_MEMBER_ID = 1

export interface CreatePostPayload {
  title: string
  content: string
  imageUrls?: string[]
  notice?: boolean
}

export interface CreateCommentPayload {
  content: string
}

export interface PostResponse {
  id: number
  title: string
  content: string
  imageUrls: string[]
  viewCount: number
  display: boolean
  notice: boolean
}

export interface PostListItemResponse extends PostResponse {
  authorNickname: string
  createdAt: string
  commentCount: number
  recommendCount: number
}

export interface CommentResponse {
  id: number
  postId: number
  memberId: number
  authorNickname: string
  content: string
  display: boolean
  createdAt: string
}

export interface PostRecommendResponse {
  id: number
  postId: number
  memberId: number
  display: boolean
  createdAt: string
}

const isPostResponse = (data: unknown): data is PostResponse => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const post = data as Partial<PostResponse>
  return typeof post.id === 'number' &&
    typeof post.title === 'string' &&
    typeof post.content === 'string' &&
    Array.isArray(post.imageUrls) &&
    post.imageUrls.every(imageUrl => typeof imageUrl === 'string' && imageUrl.trim().length > 0) &&
    typeof post.viewCount === 'number' &&
    typeof post.display === 'boolean' &&
    typeof post.notice === 'boolean'
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

const isCommentResponse = (data: unknown): data is CommentResponse => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const comment = data as Partial<CommentResponse>
  return typeof comment.id === 'number' &&
    typeof comment.postId === 'number' &&
    typeof comment.memberId === 'number' &&
    typeof comment.authorNickname === 'string' &&
    typeof comment.content === 'string' &&
    typeof comment.display === 'boolean' &&
    typeof comment.createdAt === 'string'
}

const isPostRecommendResponse = (data: unknown): data is PostRecommendResponse => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const recommend = data as Partial<PostRecommendResponse>
  return typeof recommend.id === 'number' &&
    typeof recommend.postId === 'number' &&
    typeof recommend.memberId === 'number' &&
    typeof recommend.display === 'boolean' &&
    typeof recommend.createdAt === 'string'
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

    // 목록 API는 원칙적으로 display=true만 내려주지만, 프론트 경계에서도 한 번 더 거른다.
    // 관리자 숨김 직후 오래된 캐시나 잘못된 목업 응답이 섞여도 사용자 목록에는 숨김 글이 보이지 않는다.
    return response.data.filter(post => post.display)
  },

  listComments: async (postId: number): Promise<CommentResponse[]> => {
    const response = await axios.get<CommentResponse[]>(`/api/posts/${postId}/comments`)

    // 댓글 목록도 Vite fallback 문자열이나 깨진 DTO가 들어오면 화면에 렌더링하지 않는다.
    // API 경계에서 배열과 댓글 DTO 형태를 함께 확인해 상세 화면을 단순하게 유지한다.
    if (!Array.isArray(response.data) || !response.data.every(isCommentResponse)) {
      throw new Error('Invalid comment list response')
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
      // 글쓰기 화면은 이미지 파일 업로드가 붙기 전에도 URL 배열을 보낼 수 있다.
      // 저장 전 trim/filter를 해두면 백엔드와 프론트가 같은 깨끗한 계약을 공유한다.
      imageUrls: payload.imageUrls?.map(imageUrl => imageUrl.trim()).filter(imageUrl => imageUrl.length > 0) ?? [],
      // 공지 작성 UI가 붙기 전까지 일반 글은 false로 보낸다.
      // 관리자가 notice=true를 보낼 때만 백엔드가 권한을 검사한 뒤 공지로 저장한다.
      notice: payload.notice ?? false,
    })

    if (!isPostResponse(response.data)) {
      throw new Error('Invalid post response')
    }

    return response.data
  },

  createComment: async (postId: number, payload: CreateCommentPayload): Promise<CommentResponse> => {
    const response = await axios.post<CommentResponse>(`/api/posts/${postId}/comments`, {
      // 댓글 작성도 로그인 연동 전까지는 학습 계정으로 요청한다.
      // 백엔드는 memberId로 작성자를 찾으므로 UI에서 같은 고정 계정을 사용한다.
      memberId: STUDY_MEMBER_ID,
      content: payload.content,
    })

    if (!isCommentResponse(response.data)) {
      throw new Error('Invalid comment response')
    }

    return response.data
  },

  createRecommend: async (postId: number): Promise<PostRecommendResponse> => {
    const response = await axios.post<PostRecommendResponse>(`/api/posts/${postId}/recommends`, {
      // 추천 역시 아직 로그인 세션이 없으므로 학습 계정 id를 함께 보낸다.
      memberId: STUDY_MEMBER_ID,
    })

    if (!isPostRecommendResponse(response.data)) {
      throw new Error('Invalid recommend response')
    }

    return response.data
  },

  hidePost: async (postId: number): Promise<PostResponse> => {
    const response = await axios.patch<PostResponse>(`/api/posts/${postId}/hide`, {
      // 숨김은 관리자 행위라 백엔드 DTO 이름에 맞춰 actorMemberId로 보낸다.
      // 지금은 학습용 관리자 계정 id를 쓰고, 로그인 세션이 붙으면 현재 관리자 id로 교체한다.
      actorMemberId: STUDY_MEMBER_ID,
    })

    if (!isPostResponse(response.data)) {
      throw new Error('Invalid post response')
    }

    return response.data
  },
}
