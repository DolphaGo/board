import { flushPromises, mount } from '@vue/test-utils'
import { postSearchService } from 'src/api/postSearchService'
import SearchResults from './SearchResults.vue'

const mockRoute = {
  query: {
    keyword: 'kotlin',
  },
}

jest.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}))

jest.mock('src/api/postSearchService', () => ({
  postSearchService: {
    search: jest.fn(),
  },
}))

const mockedPostSearchService = postSearchService as jest.Mocked<typeof postSearchService>

describe('# Search results component', () => {
  it('should render Elasticsearch score and highlight count as board search metadata', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: 'Elasticsearch score를 게시판 검색에 반영한다',
        score: 12.3456,
        highlights: {
          title: ['<em>코프링</em> 검색 구현'],
          content: ['게시판 <em>검색</em> 스코어링'],
        },
      },
    ])

    const wrapper = mount(SearchResults, {
      global: {
        stubs: {
          MainLayout: {
            template: '<main><slot /></main>',
          },
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
        },
      },
    })
    await flushPromises()

    expect(mockedPostSearchService.search).toBeCalledWith('kotlin')
    expect(wrapper.get('.result-title').text()).toBe('코프링 검색 구현')
    expect(wrapper.get('.result-meta').text()).toContain('점수 12.35')
    expect(wrapper.get('.result-meta').text()).toContain('하이라이트 2개')
    expect(wrapper.findAll('.highlight-list li')).toHaveLength(2)
    expect(wrapper.text()).toContain('<em>코프링</em> 검색 구현')
  })
})
