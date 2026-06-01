import { mount } from '@vue/test-utils'
import ChatRoom from './ChatRoom.vue'

const mockPublish = jest.fn()
const mockSubscribe = jest.fn()
const mockDeactivate = jest.fn()
let mockConnected = true
let subscribedMessageHandler: ((message: { body: string }) => void) | undefined

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
  }) {
    this.connected = mockConnected
    this.publish = mockPublish
    this.subscribe = mockSubscribe.mockImplementation((_destination, callback) => {
      subscribedMessageHandler = callback
    })
    this.deactivate = mockDeactivate
    this.activate = jest.fn(() => this.onConnect?.())
  }),
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
    mockConnected = true
    subscribedMessageHandler = undefined
  })

  it('should not publish blank talk messages', async () => {
    const wrapper = mountChatRoom()
    mockPublish.mockClear()

    await wrapper.get('input[placeholder="메시지를 입력하세요..."]').setValue('   ')
    await wrapper.get('.message-input button').trigger('click')

    expect(mockPublish).not.toHaveBeenCalled()
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
