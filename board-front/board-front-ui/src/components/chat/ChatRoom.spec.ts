import { mount } from '@vue/test-utils'
import ChatRoom from './ChatRoom.vue'

const mockPublish = jest.fn()
const mockSubscribe = jest.fn()
const mockDeactivate = jest.fn()
let mockConnected = true
let subscribedMessageHandler: ((message: { body: string }) => void) | undefined

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
    const videoTrack = { stop: jest.fn() }
    const audioTrack = { stop: jest.fn() }
    const mediaStream = {
      getTracks: () => [videoTrack, audioTrack],
      getVideoTracks: () => [videoTrack],
      getAudioTracks: () => [audioTrack],
    } as unknown as MediaStream

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn(() => new Promise<MediaStream>((resolve) => {
          resolveMedia = resolve
        })),
      },
    })
    Object.defineProperty(globalThis, 'RTCPeerConnection', {
      configurable: true,
      value: jest.fn(() => ({
        addTrack: jest.fn(),
        close: jest.fn(),
      })),
    })

    const wrapper = mountChatRoom(true)
    wrapper.unmount()

    resolveMedia(mediaStream)
    await Promise.resolve()

    expect(videoTrack.stop).toHaveBeenCalledTimes(1)
    expect(audioTrack.stop).toHaveBeenCalledTimes(1)
    expect(globalThis.RTCPeerConnection).not.toHaveBeenCalled()
  })

  it('should stop media tracks and close peer connection after WebRTC setup on unmount', async () => {
    const videoTrack = { stop: jest.fn() }
    const audioTrack = { stop: jest.fn() }
    const mediaStream = {
      getTracks: () => [videoTrack, audioTrack],
      getVideoTracks: () => [videoTrack],
      getAudioTracks: () => [audioTrack],
    } as unknown as MediaStream
    const closePeerConnection = jest.fn()

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn(() => Promise.resolve(mediaStream)),
      },
    })
    Object.defineProperty(globalThis, 'RTCPeerConnection', {
      configurable: true,
      value: jest.fn(() => ({
        addTrack: jest.fn(),
        close: closePeerConnection,
      })),
    })

    const wrapper = mountChatRoom(true)
    await Promise.resolve()

    wrapper.unmount()

    expect(videoTrack.stop).toHaveBeenCalledTimes(1)
    expect(audioTrack.stop).toHaveBeenCalledTimes(1)
    expect(closePeerConnection).toHaveBeenCalledTimes(1)
  })
})
