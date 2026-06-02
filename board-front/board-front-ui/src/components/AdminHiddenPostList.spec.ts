import { flushPromises, mount } from '@vue/test-utils'
import { postService } from 'src/api/postService'
import AdminHiddenPostList from './AdminHiddenPostList.vue'

jest.mock('src/api/postService', () => ({
  postService: {
    listHiddenPosts: jest.fn(),
  },
}))

const mockedPostService = postService as jest.Mocked<typeof postService>

const routerLinkStub = {
  props: ['to'],
  template: '<a :data-to="to"><slot /></a>',
}

describe('# Admin hidden post list component', () => {
  it('should render hidden posts as admin recovery candidates', async () => {
    mockedPostService.listHiddenPosts.mockResolvedValue([
      {
        id: 10,
        title: '숨김 게시글',
        content: '관리자가 복구할 대상',
        imageUrls: [],
        viewCount: 3,
        display: false,
        notice: false,
        authorNickname: 'writer',
        createdAt: '2026-06-02T04:00:00',
        commentCount: 2,
        recommendCount: 5,
      },
    ])

    const wrapper = mount(AdminHiddenPostList, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    const row = wrapper.get('.board-row')

    expect(wrapper.get('h2').text()).toBe('숨김 게시글')
    expect(wrapper.get('.board-summary').text()).toBe('복구 대기 1건')
    expect(mockedPostService.listHiddenPosts).toBeCalledTimes(1)
    expect(row.get('.hidden-badge').text()).toBe('숨김')
    expect(row.get('.board-title-text').text()).toBe('숨김 게시글')
    expect(row.get('.post-preview').text()).toBe('관리자가 복구할 대상')
    expect(row.get('.board-title-link').attributes('data-to')).toBe('/post/10?role=admin')
    expect(row.get('.meta-row').text()).toContain('writer')
    expect(row.get('.meta-row').text()).toContain('2026.06.02')
    expect(row.get('.meta-row').text()).toContain('댓글 2')
    expect(row.get('.meta-row').text()).toContain('추천 5')
  })

  it('should render an empty message when there are no hidden posts', async () => {
    mockedPostService.listHiddenPosts.mockResolvedValue([])

    const wrapper = mount(AdminHiddenPostList, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('.board-message').text()).toBe('숨김 게시글이 없습니다.')
  })

  it('should render an error message when hidden posts cannot be loaded', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    mockedPostService.listHiddenPosts.mockRejectedValue(new Error('API failure'))

    const wrapper = mount(AdminHiddenPostList, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('.board-message').text()).toBe('숨김 게시글 목록을 불러오지 못했습니다.')
    consoleErrorSpy.mockRestore()
  })
})
