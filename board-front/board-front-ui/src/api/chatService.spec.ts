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
          participants: [1, 2, 3],
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
        participantCount: 3,
      },
    ])
  })

  it('should create a chat room with the study member id', async function () {
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 'room-1',
        name: '새 채팅방',
        createdAt: '2026-06-01T17:00:00',
        participants: [1],
      },
    })

    const room = await chatService.createRoom('새 채팅방')

    expect(mockedAxios.post).toBeCalledWith('/api/chat/rooms', {
      name: '새 채팅방',
      description: null,
      createdBy: 1,
    })
    expect(room.participantCount).toBe(1)
  })

  it('should create a chat room with description and max participants', async function () {
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 'room-1',
        name: '스터디 채팅방',
        createdAt: '2026-06-01T17:00:00',
        participants: [1],
      },
    })

    await chatService.createRoom('스터디 채팅방', {
      description: '코프링 검색 기능을 같이 공부한다',
      maxParticipants: 20,
    })

    expect(mockedAxios.post).toBeCalledWith('/api/chat/rooms', {
      name: '스터디 채팅방',
      description: '코프링 검색 기능을 같이 공부한다',
      createdBy: 1,
      maxParticipants: 20,
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

  it.each([
    ['joinRoom', () => chatService.joinRoom('   ')],
    ['leaveRoom', () => chatService.leaveRoom('   ')],
  ])('should ignore blank room id for %s', async function (_, action) {
    await action()

    expect(mockedAxios.post).not.toBeCalled()
  })
})
