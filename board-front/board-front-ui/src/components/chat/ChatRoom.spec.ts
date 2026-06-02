import { flushPromises, mount } from '@vue/test-utils'
import { useRouter } from 'vue-router'
import { chatService } from 'src/api/chatService'
import ChatRoom from './ChatRoom.vue'

const mockPublish = jest.fn()
const mockSubscribe = jest.fn()
const mockDeactivate = jest.fn()
const pushMock = jest.fn()
let mockConnected = true
let subscribedMessageHandler: ((message: { body: string }) => void) | undefined
let stompErrorHandler: (() => void) | undefined
const mockedChatService = chatService as jest.Mocked<typeof chatService>
const mockedUseRouter = useRouter as jest.Mock

type MockMediaTrack = {
  enabled: boolean
  stop: jest.Mock
}

jest.mock('sockjs-client', () => jest.fn())

jest.mock('@stomp/stompjs', () => ({
  Client: jest.fn().mockImplementation(function MockClient(this: {
    connected: boolean
    publish: jest.Mock
    subscribe: jest.Mock
    activate: jest.Mock
    deactivate: jest.Mock
    onConnect?: () => void
    onStompError?: () => void
  }) {
    this.connected = mockConnected
    this.publish = mockPublish
    this.subscribe = mockSubscribe.mockImplementation((_destination, callback) => {
      subscribedMessageHandler = callback
    })
    this.deactivate = mockDeactivate
    this.activate = jest.fn(() => {
      stompErrorHandler = this.onStompError
      this.onConnect?.()
    })
  }),
}))

jest.mock('src/api/chatService', () => ({
  chatService: {
    getRoom: jest.fn(),
    leaveRoom: jest.fn(),
  },
}))

jest.mock('vue-router', () => ({
  useRouter: jest.fn(),
}))

const mountChatRoom = (isVideoEnabled = false) =>
  mount(ChatRoom, {
    props: {
      roomId: 'room-1',
      username: 'study-user',
      isVideoEnabled,
    },
  })

const createMockMediaStream = () => {
  const videoTrack: MockMediaTrack = { enabled: true, stop: jest.fn() }
  const audioTrack: MockMediaTrack = { enabled: true, stop: jest.fn() }
  const stream = {
    getTracks: () => [videoTrack, audioTrack],
    getVideoTracks: () => [videoTrack],
    getAudioTracks: () => [audioTrack],
  } as unknown as MediaStream

  return { stream, videoTrack, audioTrack }
}

const mockWebRtcApis = (getUserMedia: jest.Mock, closePeerConnection = jest.fn()) => {
  // jsdom에는 mediaDevices/RTCPeerConnection이 없으므로, 브라우저 API 경계만 테스트용으로 대체한다.
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
  Object.defineProperty(globalThis, 'RTCPeerConnection', {
    configurable: true,
    value: jest.fn(() => ({
      addTrack: jest.fn(),
      close: closePeerConnection,
    })),
  })

  return { closePeerConnection }
}

describe('# Chat room component', () => {
  beforeEach(() => {
    mockPublish.mockClear()
    mockSubscribe.mockClear()
    mockDeactivate.mockClear()
    pushMock.mockClear()
    mockedChatService.getRoom.mockClear()
    mockedChatService.getRoom.mockResolvedValue({
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
    mockedChatService.leaveRoom.mockClear()
    mockedChatService.leaveRoom.mockResolvedValue(undefined)
    mockedUseRouter.mockReturnValue({
      push: pushMock,
    })
    mockConnected = true
    subscribedMessageHandler = undefined
    stompErrorHandler = undefined
  })

  it('should not publish blank talk messages', async () => {
    const wrapper = mountChatRoom()
    mockPublish.mockClear()

    await wrapper.get('input[placeholder="메시지를 입력하세요..."]').setValue('   ')
    await wrapper.get('.message-input button').trigger('click')

    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('should render chat room metadata fetched by room id', async () => {
    const wrapper = mountChatRoom()

    await flushPromises()

    expect(mockedChatService.getRoom).toHaveBeenCalledWith('room-1')
    expect(wrapper.get('[data-testid="chat-room-title"]').text()).toBe('코프링 채팅방')
    expect(wrapper.get('[data-testid="chat-room-participants"]').text()).toBe('참여자: 2/20명')
    expect(wrapper.get('[data-testid="chat-room-description"]').text()).toBe('검색과 채팅 기능을 같이 실습한다')
    expect(wrapper.get('[data-testid="chat-room-participant-list"]').text()).toBe('참여자: 방장, 참가자')
  })

  it('should keep chat usable when room metadata fetch fails', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation()
    mockedChatService.getRoom.mockRejectedValue(new Error('room failed'))

    const wrapper = mountChatRoom()
    await flushPromises()

    expect(wrapper.get('[data-testid="chat-room-title"]').text()).toBe('채팅방')
    expect(wrapper.get('[data-testid="chat-room-detail-feedback"]').text()).toBe(
      '채팅방 정보를 불러오지 못했습니다. 메시지는 계속 보낼 수 있습니다.'
    )
    expect(mockSubscribe).toHaveBeenCalledWith('/topic/chat/room-1', expect.any(Function))
    error.mockRestore()
  })

  it('should publish talk messages and clear the input', async () => {
    const wrapper = mountChatRoom()
    mockPublish.mockClear()

    const input = wrapper.get('input[placeholder="메시지를 입력하세요..."]')
    await input.setValue('테스트 메시지')
    await wrapper.get('.message-input button').trigger('click')

    expect(mockPublish).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledWith({
      destination: '/app/chat.sendMessage',
      body: expect.any(String),
    })
    expect(JSON.parse(mockPublish.mock.calls[0][0].body)).toMatchObject({
      type: 'TALK',
      roomId: 'room-1',
      sender: 'study-user',
      content: '테스트 메시지',
    })
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('should keep the input and render a feedback message when publishing a talk message fails', async () => {
    const wrapper = mountChatRoom()
    const error = jest.spyOn(console, 'error').mockImplementation()
    mockPublish.mockClear()
    mockPublish.mockImplementationOnce(() => {
      throw new Error('publish failed')
    })

    const input = wrapper.get('input[placeholder="메시지를 입력하세요..."]')
    await input.setValue('실패해도 남아야 하는 메시지')

    await wrapper.get('.message-input button').trigger('click')
    await wrapper.vm.$nextTick()

    expect((input.element as HTMLInputElement).value).toBe('실패해도 남아야 하는 메시지')
    expect(wrapper.get('[data-testid="connection-feedback-kind"]').text()).toBe('전송 실패')
    expect(wrapper.get('.connection-feedback').text()).toBe(
      '전송 실패 메시지 전송에 실패했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.'
    )
    expect(error).toHaveBeenCalledWith('채팅 메시지 전송 실패:', expect.any(Error))
    error.mockRestore()
  })

  it('should render messages received from the subscription', async () => {
    const wrapper = mountChatRoom()

    subscribedMessageHandler?.({
      body: JSON.stringify({
        type: 'TALK',
        roomId: 'room-1',
        sender: 'other-user',
        content: '수신 메시지',
        timestamp: '2026-06-01T18:29:00',
      }),
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.message.received .sender').text()).toBe('other-user')
    expect(wrapper.get('.message.received p').text()).toBe('수신 메시지')
    expect(wrapper.get('.message.received .timestamp').text()).toBe('18:29')
  })

  it('should subscribe to the current room topic', () => {
    mountChatRoom()

    expect(mockSubscribe).toHaveBeenCalledWith('/topic/chat/room-1', expect.any(Function))
  })

  it('should publish enter messages to the add-user endpoint', () => {
    mountChatRoom()

    expect(mockPublish).toHaveBeenCalledWith({
      destination: '/app/chat.addUser',
      body: expect.any(String),
    })
    expect(JSON.parse(mockPublish.mock.calls[0][0].body)).toMatchObject({
      type: 'ENTER',
      roomId: 'room-1',
      sender: 'study-user',
      content: 'study-user님이 입장하셨습니다.',
    })
  })

  it('should ignore messages from another room', async () => {
    const wrapper = mountChatRoom()

    subscribedMessageHandler?.({
      body: JSON.stringify({
        type: 'TALK',
        roomId: 'other-room',
        sender: 'other-user',
        content: '다른 방 메시지',
        timestamp: '2026-06-01T19:05:00',
      }),
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.message.received').exists()).toBe(false)
  })

  it('should ignore invalid JSON messages received from the subscription', async () => {
    const wrapper = mountChatRoom()
    const warn = jest.spyOn(console, 'warn').mockImplementation()

    expect(() => {
      subscribedMessageHandler?.({ body: '{invalid-json' })
    }).not.toThrow()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.message.received').exists()).toBe(false)
    expect(warn).toHaveBeenCalledWith('잘못된 채팅 메시지를 무시했습니다:', expect.any(SyntaxError))
    warn.mockRestore()
  })

  it('should ignore messages missing required chat fields', async () => {
    const wrapper = mountChatRoom()
    const warn = jest.spyOn(console, 'warn').mockImplementation()

    subscribedMessageHandler?.({
      body: JSON.stringify({
        type: 'TALK',
        roomId: 'room-1',
        content: 'sender가 없는 메시지',
      }),
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.message.received').exists()).toBe(false)
    expect(warn).toHaveBeenCalledWith('필수 필드가 없는 채팅 메시지를 무시했습니다:', expect.any(Object))
    warn.mockRestore()
  })

  it('should ignore messages with unsupported chat type', async () => {
    const wrapper = mountChatRoom()
    const warn = jest.spyOn(console, 'warn').mockImplementation()

    subscribedMessageHandler?.({
      body: JSON.stringify({
        type: 'NOTICE',
        roomId: 'room-1',
        sender: 'other-user',
        content: '지원하지 않는 타입',
      }),
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.message.received').exists()).toBe(false)
    expect(warn).toHaveBeenCalledWith('지원하지 않는 채팅 타입을 무시했습니다:', 'NOTICE')
    warn.mockRestore()
  })

  it('should render a connection error message when STOMP reports an error', async () => {
    const wrapper = mountChatRoom()

    stompErrorHandler?.()
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-testid="connection-feedback-kind"]').text()).toBe('연결 문제')
    expect(wrapper.get('.connection-feedback').text()).toBe(
      '연결 문제 채팅 서버 연결에 문제가 생겼습니다. 새로고침하거나 잠시 후 다시 시도해주세요.'
    )
  })

  it('should publish leave message and deactivate STOMP on unmount', () => {
    const wrapper = mountChatRoom()
    mockPublish.mockClear()

    wrapper.unmount()

    expect(mockPublish).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledWith({
      destination: '/app/chat.sendMessage',
      body: expect.any(String),
    })
    expect(JSON.parse(mockPublish.mock.calls[0][0].body)).toMatchObject({
      type: 'LEAVE',
      roomId: 'room-1',
      sender: 'study-user',
      content: 'study-user님이 퇴장하셨습니다.',
    })
    expect(mockDeactivate).toHaveBeenCalledTimes(1)
  })

  it('should leave the room through the REST API on unmount', () => {
    const wrapper = mountChatRoom()

    wrapper.unmount()

    expect(mockedChatService.leaveRoom).toHaveBeenCalledWith('room-1')
  })

  it('should leave the room and navigate to the room list when clicking the leave button', async () => {
    const wrapper = mountChatRoom()
    mockPublish.mockClear()

    await wrapper.get('.leave-room-btn').trigger('click')

    expect(mockedChatService.leaveRoom).toHaveBeenCalledWith('room-1')
    expect(mockPublish).toHaveBeenCalledWith({
      destination: '/app/chat.sendMessage',
      body: expect.any(String),
    })
    expect(JSON.parse(mockPublish.mock.calls[0][0].body)).toMatchObject({
      type: 'LEAVE',
      roomId: 'room-1',
      sender: 'study-user',
      content: 'study-user님이 퇴장하셨습니다.',
    })
    expect(mockDeactivate).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/chat/rooms')
  })

  it('should not send duplicate leave events when unmounted after clicking the leave button', async () => {
    const wrapper = mountChatRoom()
    mockPublish.mockClear()

    await wrapper.get('.leave-room-btn').trigger('click')
    wrapper.unmount()

    expect(mockedChatService.leaveRoom).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledTimes(1)
    expect(mockDeactivate).toHaveBeenCalledTimes(1)
  })

  it('should skip leave message and deactivate when STOMP is disconnected on unmount', () => {
    mockConnected = false
    const wrapper = mountChatRoom()
    mockPublish.mockClear()

    wrapper.unmount()

    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockDeactivate).not.toHaveBeenCalled()
  })

  it('should stop media tracks when WebRTC setup finishes after unmount', async () => {
    let resolveMedia: (stream: MediaStream) => void = () => undefined
    const { stream, videoTrack, audioTrack } = createMockMediaStream()
    mockWebRtcApis(jest.fn(() => new Promise<MediaStream>((resolve) => {
      resolveMedia = resolve
    })))

    const wrapper = mountChatRoom(true)
    wrapper.unmount()

    resolveMedia(stream)
    await Promise.resolve()

    expect(videoTrack.stop).toHaveBeenCalledTimes(1)
    expect(audioTrack.stop).toHaveBeenCalledTimes(1)
    expect(globalThis.RTCPeerConnection).not.toHaveBeenCalled()
  })

  it('should stop media tracks and close peer connection after WebRTC setup on unmount', async () => {
    const { stream, videoTrack, audioTrack } = createMockMediaStream()
    const { closePeerConnection } = mockWebRtcApis(jest.fn(() => Promise.resolve(stream)))

    const wrapper = mountChatRoom(true)
    await Promise.resolve()

    wrapper.unmount()

    expect(videoTrack.stop).toHaveBeenCalledTimes(1)
    expect(audioTrack.stop).toHaveBeenCalledTimes(1)
    expect(closePeerConnection).toHaveBeenCalledTimes(1)
  })

  it('should toggle local video track enabled state', async () => {
    const { stream, videoTrack } = createMockMediaStream()
    mockWebRtcApis(jest.fn(() => Promise.resolve(stream)))

    const wrapper = mountChatRoom(true)
    await Promise.resolve()

    await wrapper.findAll('.media-controls button')[0].trigger('click')

    expect(videoTrack.enabled).toBe(false)
    expect(wrapper.findAll('.media-controls button')[0].classes()).not.toContain('active')
  })

  it('should toggle local audio track enabled state', async () => {
    const { stream, audioTrack } = createMockMediaStream()
    mockWebRtcApis(jest.fn(() => Promise.resolve(stream)))

    const wrapper = mountChatRoom(true)
    await Promise.resolve()

    await wrapper.findAll('.media-controls button')[1].trigger('click')

    expect(audioTrack.enabled).toBe(false)
    expect(wrapper.findAll('.media-controls button')[1].classes()).not.toContain('active')
  })
})
