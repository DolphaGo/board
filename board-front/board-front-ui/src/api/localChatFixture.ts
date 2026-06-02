type LocalChatRoomsRequestPath =
  | { kind: 'list' }
  | { kind: 'detail'; roomId: string }
  | { kind: 'join'; roomId: string }
  | { kind: 'leave'; roomId: string }

interface LocalChatParticipantResponse {
  id: number
  nickname: string
}

interface LocalChatRoomResponse {
  id: string
  name: string
  description: string
  createdAt: string
  maxParticipants: number
  currentParticipants: number
  participants: LocalChatParticipantResponse[]
}

const LOCAL_CHAT_ROOM_ID = 'local-room-1'

export const parseLocalChatRoomsRequestPath = (requestPath: string): LocalChatRoomsRequestPath => {
  const url = new URL(requestPath, 'http://localhost')
  const parts = url.pathname.replace(/^\/+/, '').split('/').filter(part => part.length > 0)

  if (parts.length === 0) {
    return { kind: 'list' }
  }

  const roomId = parts[0] ?? LOCAL_CHAT_ROOM_ID

  if (parts[1] === 'join') {
    return { kind: 'join', roomId }
  }

  if (parts[1] === 'leave') {
    return { kind: 'leave', roomId }
  }

  return { kind: 'detail', roomId }
}

export const createLocalChatRoomFixture = (roomId: string = LOCAL_CHAT_ROOM_ID): LocalChatRoomResponse => ({
  id: roomId,
  name: '로컬 코프링 채팅방',
  description: 'Vite 단독 실행에서 채팅 목록과 입장 흐름을 확인하는 학습용 방입니다.',
  createdAt: '2026-06-02T00:00:00',
  maxParticipants: 20,
  currentParticipants: 2,
  // 실제 백엔드는 MongoDB ChatRoom의 participant id를 Member 정보로 풀어 내려준다.
  // local fixture도 같은 모양을 유지해야 ChatRoomList/ChatRoom의 DTO 경계 검증을 그대로 통과한다.
  participants: [
    { id: 1, nickname: '로컬 방장' },
    { id: 2, nickname: '학습유저' },
  ],
})

export const createLocalChatRoomsFixture = (): LocalChatRoomResponse[] => [
  createLocalChatRoomFixture(),
]
