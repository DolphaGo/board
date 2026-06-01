import { buildCreateRoomRequest } from './createRoomDialogForm'

describe('# Create room dialog form', () => {
  it('should trim dialog values and keep max participants as a number', () => {
    expect(
      buildCreateRoomRequest({
        name: '  스터디 채팅방  ',
        description: '  코프링 검색 기능을 같이 공부한다  ',
        maxParticipants: 20,
      })
    ).toEqual({
      name: '스터디 채팅방',
      options: {
        description: '코프링 검색 기능을 같이 공부한다',
        maxParticipants: 20,
      },
    })
  })

  it('should send an empty description as null', () => {
    expect(
      buildCreateRoomRequest({
        name: '스터디 채팅방',
        description: '   ',
        maxParticipants: 30,
      })
    ).toEqual({
      name: '스터디 채팅방',
      options: {
        description: null,
        maxParticipants: 30,
      },
    })
  })
})
