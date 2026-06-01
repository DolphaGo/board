import { flushPromises, mount } from '@vue/test-utils'
import { postService } from 'src/api/postService'
import PostList from './PostList.vue'

jest.mock('src/api/postService', () => ({
  postService: {
    listPosts: jest.fn(),
  },
}))

const mockedPostService = postService as jest.Mocked<typeof postService>

describe('# Post list component', () => {
  it('should render posts loaded from post service as dense board rows', async () => {
    mockedPostService.listPosts.mockResolvedValue([
      {
        id: 10,
        title: '코프링 게시글',
        content: 'Elasticsearch 색인까지 연결한다',
        viewCount: 3,
        display: true,
        authorNickname: 'writer',
        createdAt: '2026-06-02T04:00:00',
        commentCount: 2,
        recommendCount: 1,
      },
      {
        id: 11,
        title: '채팅방 WebSocket topic 분리',
        content: '방 단위 topic으로 메시지를 발행해야 다른 채팅방 메시지가 섞이지 않습니다.',
        viewCount: 7,
        display: true,
        authorNickname: 'chat-lab',
        createdAt: '2026-06-01T09:30:00',
        commentCount: 0,
        recommendCount: 3,
      },
    ])

    const wrapper = mount(PostList, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })
    await flushPromises()

    const rows = wrapper.findAll('.board-row')

    expect(wrapper.get('h2').text()).toBe('게시글')
    expect(mockedPostService.listPosts).toBeCalledTimes(1)
    expect(rows).toHaveLength(2)
    expect(rows[0].get('.board-title-link').text()).toBe('코프링 게시글')
    expect(rows[0].get('.post-preview').text()).toBe('Elasticsearch 색인까지 연결한다')
    expect(rows[0].get('.meta-row').text()).toContain('writer')
    expect(rows[0].get('.meta-row').text()).toContain('2026.06.02')
    expect(rows[0].get('.meta-row').text()).toContain('조회 3')
    expect(rows[0].get('.meta-row').text()).toContain('댓글 2')
    expect(rows[0].get('.meta-row').text()).toContain('추천 1')
  })
})
