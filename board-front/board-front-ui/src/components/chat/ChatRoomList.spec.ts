import { mount } from '@vue/test-utils'
import { useRouter } from 'vue-router'
import { chatService } from 'src/api/chatService'
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

// Vue 컴포넌트는 클릭 후 DOM 갱신과 Promise 처리가 다음 tick에 반영된다.
// 테스트가 화면 결과를 읽기 전에 비동기 작업이 끝나도록 한 번 기다린다.
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('# Chat room list component', () => {
  beforeEach(() => {
    // 이 테스트는 "채팅방 생성 실패 시 사용자가 볼 메시지"만 검증한다.
    // 목록 조회와 라우팅은 이 관심사 밖이므로 성공하는 목(mock)으로 고정한다.
    mockedChatService.getRoomList.mockResolvedValue([])
    mockedChatService.createRoom.mockRejectedValue(new Error('create failed'))
    mockedChatService.joinRoom.mockResolvedValue(undefined)
    mockedUseRouter.mockReturnValue({
      push: jest.fn(),
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
})
