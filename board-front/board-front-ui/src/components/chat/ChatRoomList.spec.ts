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
  participants: [1, 2, 3],
  participantCount: 3,
  maxParticipants: 20,
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

  it('should render a name required message when submitting a blank room name with Enter', async () => {
    const wrapper = mount(ChatRoomList)
    await flushPromises()

    await wrapper.get('.create-btn').trigger('click')
    await wrapper.get('input[placeholder="채팅방 이름을 입력하세요"]').setValue('   ')
    await wrapper.get('input[placeholder="채팅방 이름을 입력하세요"]').trigger('keyup.enter')
    await flushPromises()

    expect(wrapper.get('.dialog-feedback').text()).toBe('채팅방 이름을 입력해주세요.')
    expect(mockedChatService.createRoom).not.toHaveBeenCalled()
  })

  it('should render a max participants range message when submitting an invalid max participants value', async () => {
    const wrapper = mount(ChatRoomList)
    await flushPromises()

    await wrapper.get('.create-btn').trigger('click')
    await wrapper.get('input[placeholder="채팅방 이름을 입력하세요"]').setValue('범위 확인방')
    await wrapper.get('input[aria-label="최대 참여자 수"]').setValue(1)
    await wrapper.get('.confirm-btn').trigger('click')
    await flushPromises()

    expect(wrapper.get('.dialog-feedback').text()).toBe('최대 참여자 수는 2명 이상 100명 이하로 입력해주세요.')
    expect(mockedChatService.createRoom).not.toHaveBeenCalled()
  })

  it('should explain how to start when the room list is empty', async () => {
    const wrapper = mount(ChatRoomList)
    await flushPromises()

    expect(wrapper.get('[data-testid="chat-empty-state"]').text()).toContain('생성된 채팅방이 없습니다.')
    expect(wrapper.get('[data-testid="chat-empty-state"]').text()).toContain(
      '새 채팅방 버튼으로 방을 만들면 생성 후 바로 입장합니다.'
    )
    expect(wrapper.get('[data-testid="chat-empty-state"]').text()).toContain(
      '목록에서 방을 선택하면 join API로 정원을 다시 확인한 뒤 채팅 화면으로 이동합니다.'
    )
  })

  it('should explain that retry reloads the chat room list API after a list error', async () => {
    mockedChatService.getRoomList.mockRejectedValue(new Error('list failed'))

    const wrapper = mount(ChatRoomList)
    await flushPromises()

    expect(wrapper.get('[data-testid="chat-list-error"]').text()).toContain(
      '채팅방 목록을 불러오는데 실패했습니다.'
    )
    expect(wrapper.get('[data-testid="chat-list-error"]').text()).toContain(
      '다시 시도는 채팅방 목록 API를 다시 호출해 최신 방과 정원 상태를 읽습니다.'
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

  it('should render current and maximum participants for each room', async () => {
    mockedChatService.getRoomList.mockResolvedValue([
      chatRoomFixture({
        participantCount: 3,
        maxParticipants: 20,
      }),
    ])

    const wrapper = mount(ChatRoomList)
    await flushPromises()

    expect(wrapper.get('.participant-count').text()).toBe('참여자: 3/20명')
  })

  it('should block entering a full room from the room list', async () => {
    mockedChatService.getRoomList.mockResolvedValue([
      chatRoomFixture({
        participantCount: 20,
        maxParticipants: 20,
      }),
    ])

    const wrapper = mount(ChatRoomList)
    await flushPromises()

    expect(wrapper.get('.room-status').text()).toBe('정원 마감')

    await wrapper.get('.room-item').trigger('click')
    await flushPromises()

    expect(wrapper.get('.action-feedback').text()).toBe('정원이 가득 찬 채팅방입니다.')
    expect(mockedChatService.joinRoom).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
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

  it('should refresh room capacity after an enter failure', async () => {
    mockedChatService.getRoomList
      .mockResolvedValueOnce([
        chatRoomFixture({
          id: 'room-4',
          name: '마감 직전방',
          participantCount: 1,
          maxParticipants: 2,
        }),
      ])
      .mockResolvedValueOnce([
        chatRoomFixture({
          id: 'room-4',
          name: '마감 직전방',
          participantCount: 2,
          maxParticipants: 2,
        }),
      ])
    mockedChatService.joinRoom.mockRejectedValue(new Error('room is full'))

    const wrapper = mount(ChatRoomList)
    await flushPromises()

    await wrapper.get('.room-item').trigger('click')
    await flushPromises()

    expect(mockedChatService.getRoomList).toHaveBeenCalledTimes(2)
    expect(wrapper.get('.participant-count').text()).toBe('참여자: 2/2명')
    expect(wrapper.get('.room-status').text()).toBe('정원 마감')
    expect(wrapper.get('.action-feedback').text()).toBe(
      '채팅방 입장에 실패했습니다. 목록을 새로고침한 뒤 다시 시도해주세요.'
    )
  })
})
