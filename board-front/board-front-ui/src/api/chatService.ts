import axios from 'axios'

const BASE_URL = '/api'
const STUDY_MEMBER_ID = 1

interface ChatRoomResponse {
  id: string
  name: string
  createdAt: string
  participants?: number[]
}

export interface ChatRoom {
  id: string
  name: string
  participantCount: number
  createdAt: string
}

const toChatRoom = (room: ChatRoomResponse): ChatRoom => ({
  id: room.id,
  name: room.name,
  // 백엔드는 참가자 id Set을 내려준다.
  // 화면은 인원수만 필요하므로 API 경계에서 UI가 쓰기 좋은 값으로 변환한다.
  participantCount: room.participants?.length ?? 0,
  createdAt: room.createdAt,
})

export const chatService = {
  // 채팅방 목록 조회
  getRoomList: async (): Promise<ChatRoom[]> => {
    const response = await axios.get<ChatRoomResponse[]>(`${BASE_URL}/chat/rooms`)
    return response.data.map(toChatRoom)
  },

  // 채팅방 생성
  createRoom: async (name: string): Promise<ChatRoom> => {
    const response = await axios.post<ChatRoomResponse>(`${BASE_URL}/chat/rooms`, {
      name,
      description: null,
      // 공부용 MVP라 로그인 기능과 연결하기 전까지는 고정 학습 계정으로 요청한다.
      // 이후 Kakao 로그인과 회원 세션이 붙으면 이 값은 로그인 사용자 id로 교체한다.
      createdBy: STUDY_MEMBER_ID,
    })
    return toChatRoom(response.data)
  },

  // 채팅방 입장
  joinRoom: async (roomId: string): Promise<void> => {
    await axios.post(`${BASE_URL}/chat/rooms/${roomId}/join`, { memberId: STUDY_MEMBER_ID })
  },

  // 채팅방 나가기
  leaveRoom: async (roomId: string): Promise<void> => {
    await axios.post(`${BASE_URL}/chat/rooms/${roomId}/leave`, { memberId: STUDY_MEMBER_ID })
  }
}
