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
        display: true,
        score: 12.3456,
        highlights: {
          title: ['<em>코프링</em> 검색 구현'],
          content: ['게시판 <em>검색</em> 스코어링'],
        },
        scoringSignals: [
          {
            field: 'title',
            category: 'BM25_TEXT',
            label: '제목 원문',
            boost: 3,
            keyword: 'kotlin',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
          {
            field: 'notice',
            category: 'FUNCTION_SCORE',
            label: '공지 가산점',
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
    expect(wrapper.text()).toContain('BM25_TEXT')
    expect(wrapper.text()).toContain('제목 원문 x3.00')
    expect(wrapper.text()).toContain('적용')
    expect(wrapper.text()).toContain('FUNCTION_SCORE')
    expect(wrapper.text()).toContain('공지 가산점 x2.00')
    expect(wrapper.text()).toContain('대기')
  })

  it('should summarize applied scoring signals so users can learn why a result ranked', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: 'Elasticsearch score를 게시판 검색에 반영한다',
        display: true,
        score: 12.3456,
        highlights: {},
        scoringSignals: [
          {
            field: 'title',
            category: 'BM25_TEXT',
            label: '제목 원문',
            boost: 3,
            keyword: 'kotlin',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
          {
            field: 'contentSyllables',
            category: 'SYLLABLE_RECALL',
            label: '본문 음절',
            boost: 0.5,
            keyword: 'ㅋㅗㅌㅡㄹㅣㄴ',
            description: '음절 분해 본문 필드는 넓게 찾되 원문 점수를 넘지 않게 낮게 둔다.',
            applied: false,
          },
          {
            field: 'notice',
            category: 'FUNCTION_SCORE',
            label: '공지 가산점',
            boost: 2,
            keyword: 'notice=true',
            description: '공지글은 function_score sum 모드로 관련도 점수에 작은 운영 가산점을 더한다.',
            applied: true,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    expect(wrapper.get('[data-testid="scoring-summary"]').text()).toBe(
      '적용 신호 2/3개: 제목 원문, 공지 가산점'
    )
  })

  it('should label each scoring signal explanation as applied evidence or pending reason', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: 'Elasticsearch score를 게시판 검색에 반영한다',
        display: true,
        score: 12.3456,
        highlights: {},
        scoringSignals: [
          {
            field: 'title',
            category: 'BM25_TEXT',
            label: '제목 원문',
            boost: 3,
            keyword: 'kotlin',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
          {
            field: 'titleSyllables',
            category: 'SYLLABLE_RECALL',
            label: '제목 음절',
            boost: 1.5,
            keyword: 'ㅋ ㅗ ㅌ ㅡ ㄹ ㄹ ㅣ ㄴ',
            description: '음절 분해 제목 필드는 한글 부분 기억과 오타성 검색을 보조한다.',
            applied: false,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    const studyLabels = wrapper.findAll('[data-testid="scoring-signal-study-label"]').map(label => label.text())
    expect(studyLabels).toEqual(['적용 근거', '대기 이유'])
    expect(wrapper.text()).toContain(
      '적용 근거: 제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.'
    )
    expect(wrapper.text()).toContain(
      '대기 이유: 음절 분해 제목 필드는 한글 부분 기억과 오타성 검색을 보조한다.'
    )
  })

  it('should expose each scoring signal as a responsive study item', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: '좁은 화면에서도 검색 점수 근거를 읽을 수 있어야 한다',
        display: true,
        score: 12.3456,
        highlights: {},
        scoringSignals: [
          {
            field: 'title',
            category: 'BM25_TEXT',
            label: '제목 원문',
            boost: 3,
            keyword: 'kotlin',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
          {
            field: 'contentInitials',
            category: 'INITIAL_RECALL',
            label: '본문 초성',
            boost: 0.25,
            keyword: 'ㅋ ㅌ ㄹ',
            description: '본문 초성 필드는 충돌이 많아 가장 낮은 boost로 둔다.',
            applied: false,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    const items = wrapper.findAll('[data-testid="scoring-signal-item"]')
    expect(items).toHaveLength(2)
    expect(items.every(item => item.classes('scoring-signal-item'))).toBe(true)
    expect(items.at(0)?.find('.signal-description').text()).toContain('적용 근거:')
    expect(items.at(1)?.find('.signal-description').text()).toContain('대기 이유:')
  })

  it('should summarize applied scoring signals by category', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: 'Elasticsearch score를 게시판 검색에 반영한다',
        display: true,
        score: 12.3456,
        highlights: {},
        scoringSignals: [
          {
            field: 'title',
            category: 'BM25_TEXT',
            label: '제목 원문',
            boost: 3,
            keyword: 'kotlin',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
          {
            field: 'content',
            category: 'BM25_TEXT',
            label: '본문 원문',
            boost: 1,
            keyword: 'kotlin',
            description: '본문 원문 match는 제목보다 넓은 recall을 담당한다.',
            applied: true,
          },
          {
            field: 'titleSyllables',
            category: 'SYLLABLE_RECALL',
            label: '제목 음절',
            boost: 1.5,
            keyword: 'ㅋㅗㅌㅡㄹㅣㄴ',
            description: '음절 분해 제목 필드는 한글 부분 기억과 오타성 검색을 보조한다.',
            applied: false,
          },
          {
            field: 'notice',
            category: 'FUNCTION_SCORE',
            label: '공지 가산점',
            boost: 2,
            keyword: 'notice=true',
            description: '공지글은 function_score sum 모드로 관련도 점수에 작은 운영 가산점을 더한다.',
            applied: true,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    expect(wrapper.get('[data-testid="scoring-category-summary"]').text()).toBe(
      '카테고리: BM25_TEXT 2개 · FUNCTION_SCORE 1개'
    )
  })

  it('should render scoring signal search tokens for syllable and initial recall fields', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: '초성 검색과 음절 검색을 같이 보여준다',
        display: true,
        score: 12.3456,
        highlights: {},
        scoringSignals: [
          {
            field: 'titleSyllables',
            category: 'SYLLABLE_RECALL',
            label: '제목 음절',
            boost: 1.5,
            keyword: 'ㅋ ㅗ ㅍ ㅡ ㄹ ㅣ ㅇ',
            description: '음절 분해 제목 필드는 한글 부분 기억과 오타성 검색을 보조한다.',
            applied: true,
          },
          {
            field: 'titleInitials',
            category: 'INITIAL_RECALL',
            label: '제목 초성',
            boost: 1,
            keyword: 'ㅋ ㅍ ㄹ',
            description: '제목 초성 필드는 ㅋㅌㄹ 같은 초성 입력을 위한 보조 신호다.',
            applied: true,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    const tokenTexts = wrapper.findAll('[data-testid="scoring-signal-keyword"]').map(token => token.text())
    expect(tokenTexts).toEqual([
      '검색 토큰: ㅋ ㅗ ㅍ ㅡ ㄹ ㅣ ㅇ',
      '검색 토큰: ㅋ ㅍ ㄹ',
    ])
  })

  it('should summarize analyzed search tokens above the result list', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: '원문, 음절, 초성 토큰을 함께 설명한다',
        display: true,
        score: 12.3456,
        highlights: {},
        scoringSignals: [
          {
            field: 'title',
            category: 'BM25_TEXT',
            label: '제목 원문',
            boost: 3,
            keyword: '코프링',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
          {
            field: 'titleSyllables',
            category: 'SYLLABLE_RECALL',
            label: '제목 음절',
            boost: 1.5,
            keyword: 'ㅋ ㅗ ㅍ ㅡ ㄹ ㅣ ㅇ',
            description: '음절 분해 제목 필드는 한글 부분 기억과 오타성 검색을 보조한다.',
            applied: true,
          },
          {
            field: 'titleInitials',
            category: 'INITIAL_RECALL',
            label: '제목 초성',
            boost: 1,
            keyword: 'ㅋ ㅍ ㄹ',
            description: '제목 초성 필드는 ㅋㅌㄹ 같은 초성 입력을 위한 보조 신호다.',
            applied: true,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    expect(wrapper.get('[data-testid="search-token-analysis"]').text()).toContain(
      '원문/BM25: 코프링'
    )
    expect(wrapper.get('[data-testid="search-token-analysis"]').text()).toContain(
      '음절 토큰: ㅋ ㅗ ㅍ ㅡ ㄹ ㅣ ㅇ'
    )
    expect(wrapper.get('[data-testid="search-token-analysis"]').text()).toContain(
      '초성 토큰: ㅋ ㅍ ㄹ'
    )
  })

  it('should show whether each analyzed search token family contributed to ranking', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: '적용된 토큰 계열과 대기 토큰 계열을 함께 설명한다',
        display: true,
        score: 12.3456,
        highlights: {},
        scoringSignals: [
          {
            field: 'title',
            category: 'BM25_TEXT',
            label: '제목 원문',
            boost: 3,
            keyword: '코프링',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
          {
            field: 'titleSyllables',
            category: 'SYLLABLE_RECALL',
            label: '제목 음절',
            boost: 1.5,
            keyword: 'ㅋ ㅗ ㅍ ㅡ ㄹ ㅣ ㅇ',
            description: '음절 분해 제목 필드는 한글 부분 기억과 오타성 검색을 보조한다.',
            applied: false,
          },
          {
            field: 'titleInitials',
            category: 'INITIAL_RECALL',
            label: '제목 초성',
            boost: 1,
            keyword: 'ㅋ ㅍ ㄹ',
            description: '제목 초성 필드는 ㅋㅌㄹ 같은 초성 입력을 위한 보조 신호다.',
            applied: true,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    const analysisText = wrapper.get('[data-testid="search-token-analysis"]').text()
    expect(analysisText).toContain('원문/BM25: 코프링 · 적용')
    expect(analysisText).toContain('음절 토큰: ㅋ ㅗ ㅍ ㅡ ㄹ ㅣ ㅇ · 대기')
    expect(analysisText).toContain('초성 토큰: ㅋ ㅍ ㄹ · 적용')
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
        display: true,
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
        display: true,
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
