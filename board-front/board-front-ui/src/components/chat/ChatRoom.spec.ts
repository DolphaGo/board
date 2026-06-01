import { mount } from '@vue/test-utils'
import ChatRoom from './ChatRoom.vue'

const mockPublish = jest.fn()
const mockSubscribe = jest.fn()
const mockDeactivate = jest.fn()

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
    this.connected = true
    this.publish = mockPublish
    this.subscribe = mockSubscribe
    this.deactivate = mockDeactivate
    this.activate = jest.fn(() => this.onConnect?.())
  }),
}))

const mountChatRoom = () =>
  mount(ChatRoom, {
    props: {
      roomId: 'room-1',
      username: 'study-user',
      isVideoEnabled: false,
    },
  })

describe('# Chat room component', () => {
  beforeEach(() => {
    mockPublish.mockClear()
    mockSubscribe.mockClear()
    mockDeactivate.mockClear()
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
})
