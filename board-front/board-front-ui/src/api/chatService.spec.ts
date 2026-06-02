import axios from 'axios'
import { chatService } from './chatService'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('# Chat service', function () {
  beforeEach(function () {
    jest.clearAllMocks()
  })

  it('should fetch chat rooms and convert participants to a count', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 'room-1',
          name: '코프링 채팅방',
          createdAt: '2026-06-01T17:00:00',
          maxParticipants: 20,
          currentParticipants: 3,
          participants: [
            { id: 1, nickname: '방장', email: 'creator@example.com' },
            { id: 2, nickname: '참가자', email: 'participant@example.com' },
            { id: 3, nickname: '검색러', email: 'searcher@example.com' },
          ],
        },
      ],
    })

    const rooms = await chatService.getRoomList()

    expect(mockedAxios.get).toBeCalledWith('/api/chat/rooms')
    expect(rooms).toEqual([
      {
        id: 'room-1',
        name: '코프링 채팅방',
        createdAt: '2026-06-01T17:00:00',
        participants: [
          { id: 1, nickname: '방장' },
          { id: 2, nickname: '참가자' },
          { id: 3, nickname: '검색러' },
        ],
        participantCount: 3,
        maxParticipants: 20,
      },
    ])
  })

  it('should fetch a chat room and convert participants to a count', async function () {
    mockedAxios.get.mockResolvedValue({
      data: {
        id: 'room-1',
        name: '코프링 채팅방',
        description: '검색과 채팅 기능을 같이 실습한다',
        createdAt: '2026-06-01T17:00:00',
        maxParticipants: 20,
        currentParticipants: 2,
        participants: [
          { id: 1, nickname: '방장', email: 'creator@example.com' },
          { id: 2, nickname: '참가자', email: 'participant@example.com' },
        ],
      },
    })

    const room = await chatService.getRoom('room-1')

    expect(mockedAxios.get).toBeCalledWith('/api/chat/rooms/room-1')
    expect(room).toEqual({
      id: 'room-1',
      name: '코프링 채팅방',
      description: '검색과 채팅 기능을 같이 실습한다',
      createdAt: '2026-06-01T17:00:00',
      participants: [
        { id: 1, nickname: '방장' },
        { id: 2, nickname: '참가자' },
      ],
      participantCount: 2,
      maxParticipants: 20,
    })
  })

  it('should create a chat room with the study user member id', async function () {
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 'room-1',
        name: '새 채팅방',
        createdAt: '2026-06-01T17:00:00',
        maxParticipants: 100,
        currentParticipants: 1,
        participants: [{ id: 1, nickname: '방장', email: 'creator@example.com' }],
      },
    })

    const room = await chatService.createRoom('새 채팅방')

    expect(mockedAxios.post).toBeCalledWith('/api/chat/rooms', {
      name: '새 채팅방',
      description: null,
      createdBy: 2,
    })
    expect(room).toMatchObject({
      participantCount: 1,
      participants: [{ id: 1, nickname: '방장' }],
    })
  })

  it('should create a chat room with description and max participants', async function () {
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 'room-1',
        name: '스터디 채팅방',
        createdAt: '2026-06-01T17:00:00',
        maxParticipants: 20,
        currentParticipants: 1,
        participants: [{ id: 1, nickname: '방장', email: 'creator@example.com' }],
      },
    })

    await chatService.createRoom('스터디 채팅방', {
      description: '코프링 검색 기능을 같이 공부한다',
      maxParticipants: 20,
    })

    expect(mockedAxios.post).toBeCalledWith('/api/chat/rooms', {
      name: '스터디 채팅방',
      description: '코프링 검색 기능을 같이 공부한다',
      createdBy: 2,
      maxParticipants: 20,
    })
  })

  it('should join and leave chat rooms with the study user member id', async function () {
    mockedAxios.post.mockResolvedValue({ data: undefined })

    await chatService.joinRoom('room-1')
    await chatService.leaveRoom('room-1')

    expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/chat/rooms/room-1/join', {
      memberId: 2,
    })
    expect(mockedAxios.post).toHaveBeenNthCalledWith(2, '/api/chat/rooms/room-1/leave', {
      memberId: 2,
    })
  })

  it('should ignore blank room name when creating a chat room', async function () {
    await expect(chatService.createRoom('   ')).rejects.toThrow('Chat room name is required')

    expect(mockedAxios.post).not.toBeCalled()
  })

  it('should reject malformed chat room list responses', async function () {
    mockedAxios.get.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(chatService.getRoomList()).rejects.toThrow('Invalid chat room response')
  })

  it('should reject malformed create room responses', async function () {
    mockedAxios.post.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(chatService.createRoom('새 채팅방')).rejects.toThrow('Invalid chat room response')
  })

  it('should reject malformed chat room detail responses', async function () {
    mockedAxios.get.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(chatService.getRoom('room-1')).rejects.toThrow('Invalid chat room response')
  })

  it.each([
    ['getRoom', () => chatService.getRoom('   ')],
    ['joinRoom', () => chatService.joinRoom('   ')],
    ['leaveRoom', () => chatService.leaveRoom('   ')],
  ])('should ignore blank room id for %s', async function (_, action) {
    await action()

    expect(mockedAxios.get).not.toBeCalled()
    expect(mockedAxios.post).not.toBeCalled()
  })
})
