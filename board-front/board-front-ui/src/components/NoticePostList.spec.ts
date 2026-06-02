import { flushPromises, mount } from '@vue/test-utils'
import { postService } from 'src/api/postService'
import NoticePostList from './NoticePostList.vue'

jest.mock('src/api/postService', () => ({
  postService: {
    listNoticePosts: jest.fn(),
  },
}))

const mockedPostService = postService as jest.Mocked<typeof postService>

const routerLinkStub = {
  props: ['to'],
  template: '<a :data-to="to"><slot /></a>',
}

describe('# Notice post list component', () => {
  it('should render notice posts as dense board rows', async () => {
    mockedPostService.listNoticePosts.mockResolvedValue([
      {
        id: 10,
        title: '점검 공지',
        content: '서비스 점검 시간 안내',
        imageUrls: [],
        viewCount: 12,
        display: true,
        notice: true,
        authorNickname: 'admin',
        createdAt: '2026-06-02T04:00:00',
        commentCount: 1,
        recommendCount: 4,
      },
    ])

    const wrapper = mount(NoticePostList, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    const row = wrapper.get('.board-row')

    expect(wrapper.get('h2').text()).toBe('공지사항')
    expect(wrapper.get('.board-summary').text()).toBe('고정 공지 1건')
    expect(mockedPostService.listNoticePosts).toBeCalledTimes(1)
    expect(row.get('.notice-badge').text()).toBe('공지')
    expect(row.get('.board-title-text').text()).toBe('점검 공지')
    expect(row.get('.board-title-link').attributes('data-to')).toBe('/post/10')
    expect(row.get('.post-preview').text()).toBe('서비스 점검 시간 안내')
    expect(row.get('.meta-row').text()).toContain('admin')
    expect(row.get('.meta-row').text()).toContain('2026.06.02')
    expect(row.get('.meta-row').text()).toContain('조회 12')
    expect(row.get('.meta-row').text()).toContain('댓글 1')
    expect(row.get('.meta-row').text()).toContain('추천 4')
  })

  it('should render an empty message when there are no notices', async () => {
    mockedPostService.listNoticePosts.mockResolvedValue([])

    const wrapper = mount(NoticePostList, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('.board-message').text()).toBe('등록된 공지사항이 없습니다.')
  })

  it('should render an error message when notices cannot be loaded', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    mockedPostService.listNoticePosts.mockRejectedValue(new Error('API failure'))

    const wrapper = mount(NoticePostList, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('.board-message').text()).toBe('공지사항을 불러오지 못했습니다.')
    consoleErrorSpy.mockRestore()
  })
})
