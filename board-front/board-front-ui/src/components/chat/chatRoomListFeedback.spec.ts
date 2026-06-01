import { buildChatRoomActionErrorMessage } from './chatRoomListFeedback'

describe('# Chat room list feedback', () => {
  it('should describe create room failures as an inline message', () => {
    expect(buildChatRoomActionErrorMessage('create')).toBe(
      '채팅방 생성에 실패했습니다. 잠시 후 다시 시도해주세요.'
    )
  })

  it('should describe enter room failures as an inline message', () => {
    expect(buildChatRoomActionErrorMessage('enter')).toBe(
      '채팅방 입장에 실패했습니다. 목록을 새로고침한 뒤 다시 시도해주세요.'
    )
  })
})
