import { flushPromises, mount } from '@vue/test-utils'
import { postSearchService } from 'src/api/postSearchService'
import { nextTick, reactive } from 'vue'
import SearchResults from './SearchResults.vue'

const mockRoute = reactive({
  query: {
    keyword: 'kotlin',
  },
})

jest.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}))

jest.mock('src/api/postSearchService', () => ({
  postSearchService: {
    search: jest.fn(),
  },
}))

const mockedPostSearchService = postSearchService as jest.Mocked<typeof postSearchService>

const mountedWrappers: Array<ReturnType<typeof mount>> = []

const mountSearchResults = () => {
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
  mountedWrappers.push(wrapper)

  return wrapper
}

const createDeferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(createdResolve => {
    resolve = createdResolve
  })

  return {
    promise,
    resolve,
  }
}

describe('# Search results component', () => {
  beforeEach(() => {
    mockRoute.query.keyword = 'kotlin'
    mockedPostSearchService.search.mockReset()
  })

  afterEach(() => {
    mountedWrappers.splice(0).forEach(wrapper => wrapper.unmount())
  })

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
        scoringSignals: [
          {
            field: 'title',
            boost: 3,
            keyword: 'kotlin',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
          {
            field: 'notice',
            boost: 2,
            keyword: 'notice=true',
            description: '공지글은 function_score sum 모드로 관련도 점수에 작은 운영 가산점을 더한다.',
            applied: false,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    expect(mockedPostSearchService.search).toBeCalledWith('kotlin')
    expect(wrapper.get('.result-title').text()).toBe('코프링 검색 구현')
    expect(wrapper.get('.result-meta').text()).toContain('점수 12.35')
    expect(wrapper.get('.result-meta').text()).toContain('하이라이트 2개')
    expect(wrapper.findAll('.highlight-list li')).toHaveLength(2)
    expect(wrapper.text()).toContain('<em>코프링</em> 검색 구현')
    expect(wrapper.findAll('.scoring-signal-list li')).toHaveLength(2)
    expect(wrapper.text()).toContain('title x3.00')
    expect(wrapper.text()).toContain('적용')
    expect(wrapper.text()).toContain('notice x2.00')
    expect(wrapper.text()).toContain('대기')
  })

  it('should clear failed search state when keyword becomes empty', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    try {
      mockedPostSearchService.search.mockRejectedValue(new Error('backend down'))

      const wrapper = mountSearchResults()
      await flushPromises()

      expect(wrapper.text()).toContain('검색 결과를 불러오지 못했습니다.')

      mockRoute.query.keyword = ''
      await nextTick()
      await flushPromises()

      expect(wrapper.text()).toContain('검색어를 입력해 주세요.')
      expect(wrapper.text()).not.toContain('검색 결과를 불러오지 못했습니다.')
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })

  it('should treat whitespace-only keyword as empty search input', async () => {
    mockRoute.query.keyword = '   '

    const wrapper = mountSearchResults()
    await flushPromises()

    expect(mockedPostSearchService.search).not.toBeCalled()
    expect(wrapper.text()).toContain('검색어를 입력해 주세요.')
  })

  it('should normalize repeated whitespace before searching from route keyword', async () => {
    mockRoute.query.keyword = '  kotlin   spring  '
    mockedPostSearchService.search.mockResolvedValue([])

    mountSearchResults()
    await flushPromises()

    expect(mockedPostSearchService.search).toBeCalledWith('kotlin spring')
  })

  it('should keep the latest keyword results when an older search resolves later', async () => {
    const kotlinSearch = createDeferred<Awaited<ReturnType<typeof postSearchService.search>>>()
    const javaSearch = createDeferred<Awaited<ReturnType<typeof postSearchService.search>>>()

    mockedPostSearchService.search.mockImplementation(keyword =>
      keyword === 'kotlin' ? kotlinSearch.promise : javaSearch.promise
    )

    const wrapper = mountSearchResults()
    await nextTick()

    mockRoute.query.keyword = 'java'
    await nextTick()

    javaSearch.resolve([
      {
        postId: 8,
        title: '자바 검색 결과',
        contentPreview: '최신 검색어 결과입니다',
        score: 9.5,
        highlights: {},
        scoringSignals: [],
      },
    ])
    await flushPromises()

    expect(wrapper.text()).toContain('자바 검색 결과')

    kotlinSearch.resolve([
      {
        postId: 7,
        title: '코틀린 이전 검색 결과',
        contentPreview: '늦게 도착한 이전 검색어 결과입니다',
        score: 11.2,
        highlights: {},
        scoringSignals: [],
      },
    ])
    await flushPromises()

    expect(wrapper.text()).toContain('자바 검색 결과')
    expect(wrapper.text()).not.toContain('코틀린 이전 검색 결과')
  })
})
