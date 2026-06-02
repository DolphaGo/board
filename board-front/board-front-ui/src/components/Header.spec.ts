import { flushPromises, mount } from '@vue/test-utils'
import { searchRankingService } from 'src/api/searchRankingService'
import Header from './Header.vue'

const routerPush = jest.fn()

jest.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

jest.mock('src/api/searchRankingService', () => ({
  searchRankingService: {
    recordKeyword: jest.fn(),
    suggestKeywords: jest.fn(),
  },
}))

const mockedSearchRankingService = searchRankingService as jest.Mocked<typeof searchRankingService>

const routerLinkStub = {
  props: ['to'],
  template: '<a :data-to="to"><slot /></a>',
}

describe('# Header component', () => {
  beforeEach(() => {
    routerPush.mockReset()
    mockedSearchRankingService.recordKeyword.mockReset()
    mockedSearchRankingService.recordKeyword.mockResolvedValue()
    mockedSearchRankingService.suggestKeywords.mockReset()
    mockedSearchRankingService.suggestKeywords.mockResolvedValue([])
  })

  it('should expose real router links for home and post list navigation', () => {
    const wrapper = mount(Header, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })

    const homeLink = wrapper.find('[data-to="/"][data-nav="home"]')
    const postsLink = wrapper.find('[data-to="/"][data-nav="posts"]')

    expect(homeLink.exists()).toBe(true)
    expect(homeLink.text()).toBe('Home')
    expect(postsLink.exists()).toBe(true)
    expect(postsLink.text()).toBe('Posts')
    expect(wrapper.find('a[href="#"]').exists()).toBe(false)
  })

  it('should expose a navigation link to the admin hidden post list', () => {
    const wrapper = mount(Header, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })

    const hiddenPostLink = wrapper.find('[data-to="/admin/hidden-posts"]')

    expect(hiddenPostLink.exists()).toBe(true)
    expect(hiddenPostLink.text()).toBe('숨김 관리')
  })

  it('should expose a navigation link to the post editor', () => {
    const wrapper = mount(Header, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })

    const postEditorLink = wrapper.find('[data-to="/post/edit"]')

    expect(postEditorLink.exists()).toBe(true)
    expect(postEditorLink.text()).toBe('글쓰기')
  })

  it('should expose a navigation link to notices', () => {
    const wrapper = mount(Header, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })

    const noticesLink = wrapper.find('[data-to="/notices"]')

    expect(noticesLink.exists()).toBe(true)
    expect(noticesLink.text()).toBe('공지사항')
  })

  it('should render ranked keyword suggestions while typing in the search input', async () => {
    mockedSearchRankingService.suggestKeywords.mockResolvedValue([
      { keyword: 'kotlin spring', score: 7 },
      { keyword: 'kotlin elasticsearch', score: 5 },
    ])
    const wrapper = mount(Header, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })

    await wrapper.get('.header-search-input').setValue('kotlin')
    await flushPromises()

    expect(mockedSearchRankingService.suggestKeywords).toBeCalledWith('kotlin', 5)
    expect(wrapper.findAll('[data-testid="search-suggestion"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('kotlin spring')
    expect(wrapper.text()).toContain('7회')
  })

  it('should search with the clicked suggestion keyword', async () => {
    mockedSearchRankingService.suggestKeywords.mockResolvedValue([
      { keyword: 'kotlin spring', score: 7 },
    ])
    const wrapper = mount(Header, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })

    await wrapper.get('.header-search-input').setValue('kotlin')
    await flushPromises()
    await wrapper.get('[data-testid="search-suggestion"]').trigger('click')
    await flushPromises()

    expect(mockedSearchRankingService.recordKeyword).toBeCalledWith('kotlin spring')
    expect(routerPush).toBeCalledWith({
      path: '/search',
      query: {
        keyword: 'kotlin spring',
      },
    })
  })
})
