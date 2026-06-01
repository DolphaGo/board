import { router } from './router'

const getChatRoomRouteProps = () => {
  const chatRoomRoute = router.getRoutes().find(route => route.path === '/chat/rooms/:id')
  return (chatRoomRoute?.props.default ?? (() => undefined)) as (route: {
    params: Record<string, unknown>
    query: Record<string, unknown>
  }) => unknown
}

describe('# Router chat room props', () => {
  it('should use the first route value when room id and username are arrays', () => {
    const props = getChatRoomRouteProps()({
      params: { id: ['room-1', 'room-2'] },
      query: { username: ['alice', 'bob'] },
    })

    expect(props).toEqual({
      roomId: 'room-1',
      username: 'alice',
      isVideoEnabled: false,
    })
  })

  it('should use the study username when username query is blank', () => {
    const props = getChatRoomRouteProps()({
      params: { id: 'room-1' },
      query: { username: '' },
    })

    expect(props).toEqual({
      roomId: 'room-1',
      username: 'study-user',
      isVideoEnabled: false,
    })
  })
})
