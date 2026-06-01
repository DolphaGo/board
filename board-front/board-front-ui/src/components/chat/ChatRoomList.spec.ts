import { mount } from '@vue/test-utils'
import { useRouter } from 'vue-router'
import { chatService, type ChatRoom } from 'src/api/chatService'
import ChatRoomList from './ChatRoomList.vue'

jest.mock('src/api/chatService', () => ({
  chatService: {
    getRoomList: jest.fn(),
    createRoom: jest.fn(),
    joinRoom: jest.fn(),
  },
}))

jest.mock('vue-router', () => ({
  useRouter: jest.fn(),
}))

const mockedChatService = chatService as jest.Mocked<typeof chatService>
const mockedUseRouter = useRouter as jest.Mock
const pushMock = jest.fn()

// Vue 컴포넌트는 클릭 후 DOM 갱신과 Promise 처리가 다음 tick에 반영된다.
// 테스트가 화면 결과를 읽기 전에 비동기 작업이 끝나도록 한 번 기다린다.
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const chatRoomFixture = (overrides: Partial<ChatRoom> = {}): ChatRoom => ({
  id: 'room-1',
  name: '스터디 채팅방',
  participantCount: 3,
  createdAt: '2026-06-01T09:00:00.000Z',
  ...overrides,
})

describe('# Chat room list component', () => {
  beforeEach(() => {
    pushMock.mockClear()
    // 각 테스트의 관심사가 아닌 API는 성공하는 목(mock)으로 고정한다.
    // 이렇게 하면 테스트 실패 원인이 검증하려는 화면 동작에 집중된다.
    mockedChatService.getRoomList.mockResolvedValue([])
    mockedChatService.createRoom.mockRejectedValue(new Error('create failed'))
    mockedChatService.joinRoom.mockResolvedValue(undefined)
    mockedUseRouter.mockReturnValue({
      push: pushMock,
    })
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render the create failure message inside the dialog', async () => {
    const wrapper = mount(ChatRoomList)
    await flushPromises()

    await wrapper.get('.create-btn').trigger('click')
    await wrapper.get('input[placeholder="채팅방 이름을 입력하세요"]').setValue('실패 확인방')
    await wrapper.get('.confirm-btn').trigger('click')
    await flushPromises()

    expect(wrapper.get('.dialog-feedback').text()).toBe(
      '채팅방 생성에 실패했습니다. 잠시 후 다시 시도해주세요.'
    )
  })

  it('should enter the room with the Enter key from a room item', async () => {
    mockedChatService.getRoomList.mockResolvedValue([
      chatRoomFixture(),
    ])

    const wrapper = mount(ChatRoomList)
    await flushPromises()

    const roomItem = wrapper.get('.room-item')
    expect(roomItem.attributes('role')).toBe('button')
    expect(roomItem.attributes('tabindex')).toBe('0')

    await roomItem.trigger('keyup.enter')
    await flushPromises()

    expect(mockedChatService.joinRoom).toHaveBeenCalledWith('room-1')
    expect(pushMock).toHaveBeenCalledWith({
      path: '/chat/rooms/room-1',
      query: { username: 'study-user' },
    })
  })

  it('should enter the room with the Space key from a room item', async () => {
    mockedChatService.getRoomList.mockResolvedValue([
      chatRoomFixture({
        id: 'room-2',
        name: '질문 채팅방',
        participantCount: 5,
        createdAt: '2026-06-01T10:00:00.000Z',
      }),
    ])

    const wrapper = mount(ChatRoomList)
    await flushPromises()

    await wrapper.get('.room-item').trigger('keyup.space')
    await flushPromises()

    expect(mockedChatService.joinRoom).toHaveBeenCalledWith('room-2')
    expect(pushMock).toHaveBeenCalledWith({
      path: '/chat/rooms/room-2',
      query: { username: 'study-user' },
    })
  })

  it('should render the enter failure message above the room list', async () => {
    mockedChatService.getRoomList.mockResolvedValue([
      chatRoomFixture({
        id: 'room-3',
        name: '오류 확인방',
        participantCount: 1,
        createdAt: '2026-06-01T11:00:00.000Z',
      }),
    ])
    mockedChatService.joinRoom.mockRejectedValue(new Error('join failed'))

    const wrapper = mount(ChatRoomList)
    await flushPromises()

    await wrapper.get('.room-item').trigger('click')
    await flushPromises()

    expect(wrapper.get('.action-feedback').text()).toBe(
      '채팅방 입장에 실패했습니다. 목록을 새로고침한 뒤 다시 시도해주세요.'
    )
    expect(pushMock).not.toHaveBeenCalled()
  })
})
