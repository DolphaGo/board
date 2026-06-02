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
  const createPost = (id: number) => ({
    id,
    title: `게시글 ${id}`,
    content: `본문 ${id}`,
    imageUrls: [],
    viewCount: id,
    display: true,
    notice: false,
    authorNickname: 'writer',
    createdAt: '2026-06-02T04:00:00',
    commentCount: 0,
    recommendCount: 0,
  })

  it('should render posts loaded from post service as dense board rows', async () => {
    mockedPostService.listPosts.mockResolvedValue({
      items: [
        {
          id: 10,
          title: '코프링 게시글',
          content: 'Elasticsearch 색인까지 연결한다',
          imageUrls: [],
          viewCount: 3,
          display: true,
          notice: true,
          authorNickname: 'writer',
          createdAt: '2026-06-02T04:00:00',
          commentCount: 2,
          recommendCount: 1,
        },
        {
          id: 11,
          title: '채팅방 WebSocket topic 분리',
          content: '방 단위 topic으로 메시지를 발행해야 다른 채팅방 메시지가 섞이지 않습니다.',
          imageUrls: [],
          viewCount: 7,
          display: true,
          notice: false,
          authorNickname: 'chat-lab',
          createdAt: '2026-06-01T09:30:00',
          commentCount: 0,
          recommendCount: 3,
        },
      ],
      page: 0,
      size: 10,
      totalElements: 2,
      totalPages: 1,
    })

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
    expect(mockedPostService.listPosts).toBeCalledWith({ page: 0, size: 10 })
    expect(rows).toHaveLength(2)
    expect(rows[0].get('.board-title-text').text()).toBe('코프링 게시글')
    expect(rows[0].get('.notice-badge').text()).toBe('공지')
    expect(rows[1].find('.notice-badge').exists()).toBe(false)
    expect(rows[0].get('.post-preview').text()).toBe('Elasticsearch 색인까지 연결한다')
    expect(rows[0].get('.meta-row').text()).toContain('writer')
    expect(rows[0].get('.meta-row').text()).toContain('2026.06.02')
    expect(rows[0].get('.meta-row').text()).toContain('조회 3')
    expect(rows[0].get('.meta-row').text()).toContain('댓글 2')
    expect(rows[0].get('.meta-row').text()).toContain('추천 1')
  })

  it('should render bottom pagination and request the next board page from the server', async () => {
    mockedPostService.listPosts
      .mockResolvedValueOnce({
        items: Array.from({ length: 10 }, (_, index) => createPost(index + 1)),
        page: 0,
        size: 10,
        totalElements: 13,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: 3 }, (_, index) => createPost(index + 11)),
        page: 1,
        size: 10,
        totalElements: 13,
        totalPages: 2,
      })

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

    expect(wrapper.findAll('.board-row')).toHaveLength(10)
    expect(wrapper.get('[data-testid="board-pagination"]').text()).toContain('1 / 2')
    expect(wrapper.get('[data-testid="board-page-prev"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.board-summary').text()).toBe('최신순 13건 · 1/2페이지')
    expect(mockedPostService.listPosts).toHaveBeenLastCalledWith({ page: 0, size: 10 })

    await wrapper.get('[data-testid="board-page-next"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.board-row')).toHaveLength(3)
    expect(wrapper.get('[data-testid="board-pagination"]').text()).toContain('2 / 2')
    expect(wrapper.get('[data-testid="board-page-next"]').attributes('disabled')).toBeDefined()
    expect(mockedPostService.listPosts).toHaveBeenLastCalledWith({ page: 1, size: 10 })
    expect(wrapper.findAll('.board-title-text').map(title => title.text())).toEqual([
      '게시글 11',
      '게시글 12',
      '게시글 13',
    ])
  })
})
