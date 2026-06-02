import axios from 'axios'

const BASE_URL = '/api'
const STUDY_MEMBER_ID = 1

interface ChatRoomResponse {
  id: string
  name: string
  description?: string | null
  createdAt: string
  maxParticipants: number
  participants?: number[]
}

export interface ChatRoom {
  id: string
  name: string
  description?: string | null
  participantCount: number
  maxParticipants: number
  createdAt: string
}

interface CreateChatRoomOptions {
  description?: string | null
  maxParticipants?: number
}

const toChatRoom = (room: ChatRoomResponse): ChatRoom => {
  const chatRoom: ChatRoom = {
    id: room.id,
    name: room.name,
    // 백엔드는 참가자 id Set을 내려준다.
    // 화면은 인원수만 필요하므로 API 경계에서 UI가 쓰기 좋은 값으로 변환한다.
    participantCount: room.participants?.length ?? 0,
    // 입장 제한 로직과 같은 숫자를 목록에도 보여주면, 사용자가 방에 들어가기 전 정원 상태를 판단할 수 있다.
    maxParticipants: room.maxParticipants,
    createdAt: room.createdAt,
  }

  if (room.description !== undefined) {
    chatRoom.description = room.description
  }

  return chatRoom
}

const isChatRoomResponse = (room: unknown): room is ChatRoomResponse => {
  if (typeof room !== 'object' || room === null) {
    return false
  }

  const candidate = room as Partial<ChatRoomResponse>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.maxParticipants === 'number' &&
    (candidate.participants === undefined || Array.isArray(candidate.participants))
  )
}

const parseChatRoom = (room: unknown): ChatRoom => {
  // Vite dev fallback HTML이나 백엔드 에러 payload가 정상 DTO처럼 흘러오면
  // 화면이 undefined 값을 렌더링하게 된다. API 경계에서 실패시켜 원인을 빨리 드러낸다.
  if (!isChatRoomResponse(room)) {
    throw new Error('Invalid chat room response')
  }

  return toChatRoom(room)
}

export const chatService = {
  // 채팅방 목록 조회
  getRoomList: async (): Promise<ChatRoom[]> => {
    const response = await axios.get<ChatRoomResponse[]>(`${BASE_URL}/chat/rooms`)
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid chat room response')
    }

    return response.data.map(parseChatRoom)
  },

  // 채팅방 상세 조회
  getRoom: async (roomId: string): Promise<ChatRoom | null> => {
    // 상세 화면은 URL params에서 roomId를 받는다.
    // 빈 값으로 요청하면 /api/chat/rooms/ 같은 모호한 URL이 되므로 API 경계에서 멈춘다.
    if (roomId.trim().length === 0) {
      return null
    }

    const response = await axios.get<ChatRoomResponse>(`${BASE_URL}/chat/rooms/${roomId}`)
    return parseChatRoom(response.data)
  },

  // 채팅방 생성
  createRoom: async (name: string, options: CreateChatRoomOptions = {}): Promise<ChatRoom> => {
    // 채팅방 이름은 사용자가 목록에서 방을 구분하는 최소 정보다.
    // 공백 이름은 백엔드도 400으로 거부하므로, 프론트 API 경계에서도 요청을 만들지 않는다.
    if (name.trim().length === 0) {
      throw new Error('Chat room name is required')
    }

    const response = await axios.post<ChatRoomResponse>(`${BASE_URL}/chat/rooms`, {
      name,
      description: options.description ?? null,
      // 공부용 MVP라 로그인 기능과 연결하기 전까지는 고정 학습 계정으로 요청한다.
      // 이후 Kakao 로그인과 회원 세션이 붙으면 이 값은 로그인 사용자 id로 교체한다.
      createdBy: STUDY_MEMBER_ID,
      ...(options.maxParticipants === undefined ? {} : { maxParticipants: options.maxParticipants }),
    })
    return parseChatRoom(response.data)
  },

  // 채팅방 입장
  joinRoom: async (roomId: string): Promise<void> => {
    // 방 id가 없으면 REST path 자체가 의미 없는 값이 된다.
    // 서버까지 잘못된 URL을 보내기보다 API service 경계에서 요청을 멈춘다.
    if (roomId.trim().length === 0) {
      return
    }

    await axios.post(`${BASE_URL}/chat/rooms/${roomId}/join`, { memberId: STUDY_MEMBER_ID })
  },

  // 채팅방 나가기
  leaveRoom: async (roomId: string): Promise<void> => {
    // 입장과 같은 이유로, 빈 방 id는 나가기 요청도 만들지 않는다.
    if (roomId.trim().length === 0) {
      return
    }

    await axios.post(`${BASE_URL}/chat/rooms/${roomId}/leave`, { memberId: STUDY_MEMBER_ID })
  }
}
