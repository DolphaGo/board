import {
  createLocalChatRoomFixture,
  createLocalChatRoomsFixture,
  parseLocalChatRoomsRequestPath,
} from './localChatFixture'

describe('# local chat API fixture', () => {
  it('should create valid chat room response fixtures for Vite-only room list', () => {
    expect(createLocalChatRoomsFixture()).toEqual([
      expect.objectContaining({
        id: 'local-room-1',
        name: '로컬 코프링 채팅방',
        description: 'Vite 단독 실행에서 채팅 목록과 입장 흐름을 확인하는 학습용 방입니다.',
        createdAt: '2026-06-02T00:00:00',
        maxParticipants: 20,
        currentParticipants: 2,
        participants: [
          { id: 1, nickname: '로컬 방장' },
          { id: 2, nickname: '학습유저' },
        ],
      }),
    ])
  })

  it('should create a valid chat room response fixture by id', () => {
    expect(createLocalChatRoomFixture('room-42')).toMatchObject({
      id: 'room-42',
      name: '로컬 코프링 채팅방',
      maxParticipants: 20,
      currentParticipants: 2,
    })
  })

  it('should distinguish list, detail, join, and leave paths under /api/chat/rooms', () => {
    expect(parseLocalChatRoomsRequestPath('/')).toEqual({ kind: 'list' })
    expect(parseLocalChatRoomsRequestPath('/room-1')).toEqual({ kind: 'detail', roomId: 'room-1' })
    expect(parseLocalChatRoomsRequestPath('/room-1/join')).toEqual({ kind: 'join', roomId: 'room-1' })
    expect(parseLocalChatRoomsRequestPath('/room-1/leave')).toEqual({ kind: 'leave', roomId: 'room-1' })
  })
})
