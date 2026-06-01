export type ChatRoomAction = 'create' | 'enter'

export const buildChatRoomActionErrorMessage = (action: ChatRoomAction): string => {
  if (action === 'create') {
    return '채팅방 생성에 실패했습니다. 잠시 후 다시 시도해주세요.'
  }

  // 입장 실패는 방이 삭제됐거나 참여자 수 제한에 걸린 경우도 있으므로 목록 갱신을 함께 안내한다.
  return '채팅방 입장에 실패했습니다. 목록을 새로고침한 뒤 다시 시도해주세요.'
}
