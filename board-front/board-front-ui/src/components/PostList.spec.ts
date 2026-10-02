import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { postService } from 'src/api/postService'
import PostList from './PostList.vue'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('src/api/postService', () => ({
  postService: {
    listPosts: vi.fn(),
  },
}))

const mockedPostService = postService as Mocked<typeof postService>

describe('# Post list component', () => {
  let router: Router
  beforeEach(async () => {
    mockedPostService.listPosts.mockReset()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
    })
    await router.push('/')
    await router.isReady()
  })
  const routerLinkStub = {
    props: ['to'],
    template: '<a :data-to="to"><slot /></a>',
  }

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
        plugins: [router],
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    const rows = wrapper.findAll('.board-row')

    expect(wrapper.get('h2').text()).toBe('게시글')
    expect(mockedPostService.listPosts).toHaveBeenCalledWith({ page: 0, size: 10 })
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
        plugins: [router],
        stubs: {
          RouterLink: routerLinkStub,
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

  it('should render compact numbered pagination and jump to first or last page', async () => {
    await router.push('/?page=4')
    mockedPostService.listPosts
      .mockResolvedValueOnce({
        items: Array.from({ length: 10 }, (_, index) => createPost(index + 31)),
        page: 3,
        size: 10,
        totalElements: 80,
        totalPages: 8,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: 10 }, (_, index) => createPost(index + 1)),
        page: 0,
        size: 10,
        totalElements: 80,
        totalPages: 8,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: 10 }, (_, index) => createPost(index + 71)),
        page: 7,
        size: 10,
        totalElements: 80,
        totalPages: 8,
      })

    const wrapper = mount(PostList, {
      global: {
        plugins: [router],
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    expect(wrapper.findAll('[data-testid="board-page-number"]').map(button => button.text())).toEqual([
      '2',
      '3',
      '4',
      '5',
      '6',
    ])
    expect(wrapper.get('[data-testid="board-page-number-current"]').text()).toBe('4')
    expect(wrapper.get('[data-testid="board-page-number-current"]').attributes('aria-current')).toBe('page')

    await wrapper.get('[data-testid="board-page-first"]').trigger('click')
    await flushPromises()

    expect(mockedPostService.listPosts).toHaveBeenLastCalledWith({ page: 0, size: 10 })
    expect(wrapper.get('[data-testid="board-page-first"]').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('.board-title-text')[0].text()).toBe('게시글 1')

    await wrapper.get('[data-testid="board-page-last"]').trigger('click')
    await flushPromises()

    expect(mockedPostService.listPosts).toHaveBeenLastCalledWith({ page: 7, size: 10 })
    expect(wrapper.get('[data-testid="board-page-last"]').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('.board-title-text')[0].text()).toBe('게시글 71')
  })

  it('restores the page from the URL and follows browser history', async () => {
    mockedPostService.listPosts.mockImplementation(async ({ page = 0 } = {}) => ({
      items: [createPost(page * 10 + 1)], page, size: 10, totalElements: 30, totalPages: 3,
    }))
    await router.push('/?page=2')
    const wrapper = mount(PostList, { global: { plugins: [router] } })
    await flushPromises()
    expect(mockedPostService.listPosts).toHaveBeenLastCalledWith({ page: 1, size: 10 })
    expect(wrapper.get('.board-title-link').attributes('href')).toBe('/post/11?page=2')
    await wrapper.get('[data-testid="board-page-next"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.page).toBe('3')
    router.back()
    await flushPromises()
    expect(wrapper.get('.board-title-text').text()).toBe('게시글 11')
  })

  it('retries the failed page without reporting an empty board', async () => {
    mockedPostService.listPosts.mockResolvedValueOnce({
      items: [createPost(1)], page: 0, size: 10, totalElements: 13, totalPages: 2,
    }).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      items: [createPost(11)], page: 1, size: 10, totalElements: 13, totalPages: 2,
    })
    const wrapper = mount(PostList, { global: { plugins: [router] } })
    await flushPromises()
    await wrapper.get('[data-testid="board-page-next"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('게시글 목록을 불러오지 못했습니다.')
    expect(wrapper.text()).not.toContain('게시글이 없습니다.')
    await wrapper.get('[data-testid="board-retry"]').trigger('click')
    await flushPromises()
    expect(mockedPostService.listPosts).toHaveBeenLastCalledWith({ page: 1, size: 10 })
    expect(wrapper.get('.board-title-text').text()).toBe('게시글 11')
  })

  it('ignores a previous page response that finishes after the current page', async () => {
    let resolveFirst!: (value: Awaited<ReturnType<typeof postService.listPosts>>) => void
    mockedPostService.listPosts.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
      .mockResolvedValueOnce({ items: [createPost(11)], page: 1, size: 10, totalElements: 13, totalPages: 2 })
    const wrapper = mount(PostList, { global: { plugins: [router] } })
    await router.push('/?page=2')
    await flushPromises()
    resolveFirst({ items: [createPost(1)], page: 0, size: 10, totalElements: 13, totalPages: 2 })
    await flushPromises()
    expect(wrapper.get('.board-title-text').text()).toBe('게시글 11')
    expect(wrapper.get('.board-page-status').text()).toBe('2 / 2')
  })

  it('returns an out-of-range URL to the last available page', async () => {
    mockedPostService.listPosts.mockResolvedValueOnce({
      items: [], page: 98, size: 10, totalElements: 13, totalPages: 2,
    }).mockResolvedValueOnce({ items: [createPost(11)], page: 1, size: 10, totalElements: 13, totalPages: 2 })
    await router.push('/?page=99')
    const wrapper = mount(PostList, { global: { plugins: [router] } })
    await flushPromises()
    expect(router.currentRoute.value.query.page).toBe('2')
    expect(wrapper.get('.board-title-text').text()).toBe('게시글 11')
  })

  it.each(['0', '-1', 'abc', '1.5'])('uses the first page for invalid page query %s', async page => {
    mockedPostService.listPosts.mockResolvedValue({ items: [], page: 0, size: 10, totalElements: 0, totalPages: 0 })
    await router.push({ path: '/', query: { page } })
    const wrapper = mount(PostList, { global: { plugins: [router] } })
    await flushPromises()
    expect(mockedPostService.listPosts).toHaveBeenLastCalledWith({ page: 0, size: 10 })
    expect(wrapper.text()).toContain('게시글이 없습니다.')
    expect(wrapper.find('[data-testid="board-retry"]').exists()).toBe(false)
  })

  it('should expose a board-local writing action below the post rows', async () => {
    mockedPostService.listPosts.mockResolvedValue({
      items: [createPost(1)],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    })

    const wrapper = mount(PostList, {
      global: {
        plugins: [router],
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    const writeLink = wrapper.get('[data-testid="board-write-link"]')

    expect(writeLink.text()).toBe('글쓰기')
    expect(writeLink.attributes('data-to')).toBe('/post/edit')
  })
})
