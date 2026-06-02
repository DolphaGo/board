import { flushPromises, mount } from '@vue/test-utils'
import { postSearchService } from 'src/api/postSearchService'
import { nextTick, reactive } from 'vue'
import { onSearchRankingChanged } from './searchRankingRefreshEvent'
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

  it('should explain highlights as matched snippets instead of score contribution', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: 'ES 하이라이트와 점수 기여를 구분해서 공부한다',
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
            keyword: '코프링',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    expect(wrapper.get('[data-testid="highlight-study-note"]').text()).toBe(
      '하이라이트는 점수를 직접 올리는 가산점이 아니라, ES가 어떤 필드의 어느 문장을 매칭했는지 보여주는 스니펫입니다.'
    )
  })

  it('should show a scoring study guide above search results', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: '검색 결과 위에서 점수 전략을 먼저 설명한다',
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
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    const guide = wrapper.get('[data-testid="search-scoring-study-guide"]').text()
    expect(guide).toContain('BM25는 제목/본문 원문 일치의 기본 관련도입니다.')
    expect(guide).toContain('음절 recall은 ㅋㅗ처럼 자모로 쪼갠 입력을 보조합니다.')
    expect(guide).toContain('초성 recall은 ㅋㅍㄹ처럼 빠르게 입력한 초성 검색을 보조합니다.')
    expect(guide).toContain('function_score는 공지 같은 운영 신호를 작은 가산점으로 더합니다.')
  })

  it('should prioritize scoring study guide rows that are present in the current response', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: '실제 응답에 포함된 점수 category를 먼저 설명한다',
        display: true,
        score: 12.3456,
        highlights: {},
        scoringSignals: [
          {
            field: 'notice',
            category: 'FUNCTION_SCORE',
            label: '공지 가산점',
            boost: 2,
            keyword: 'notice=true',
            description: '공지글은 function_score sum 모드로 관련도 점수에 작은 운영 가산점을 더한다.',
            applied: true,
          },
          {
            field: 'title',
            category: 'BM25_TEXT',
            label: '제목 원문',
            boost: 3,
            keyword: '코프링',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    const guideRows = wrapper
      .findAll('[data-testid="search-scoring-study-guide-row"]')
      .map(row => row.text())
    expect(guideRows).toEqual([
      '원문/BM25: BM25는 제목/본문 원문 일치의 기본 관련도입니다. · 응답 포함 · 적용 1/1개 · 적용 boost 3.00',
      'function_score: function_score는 공지 같은 운영 신호를 작은 가산점으로 더합니다. · 응답 포함 · 적용 1/1개 · 적용 boost 2.00',
      '음절 recall: 음절 recall은 ㅋㅗ처럼 자모로 쪼갠 입력을 보조합니다. · 보조 전략 · 이번 응답 signal 없음',
      '초성 recall: 초성 recall은 ㅋㅍㄹ처럼 빠르게 입력한 초성 검색을 보조합니다. · 보조 전략 · 이번 응답 signal 없음',
    ])
  })

  it('should prefer backend category descriptions in the scoring study guide', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: '백엔드가 내려준 category 설명을 학습 가이드에 연결한다',
        display: true,
        score: 12.3456,
        highlights: {},
        scoringSignals: [
          {
            field: 'title',
            category: 'BM25_TEXT',
            categoryDescription: '서버 설명: BM25는 term frequency와 field length를 함께 보는 원문 관련도다.',
            label: '제목 원문',
            boost: 3,
            keyword: '코프링',
            description: '제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.',
            applied: true,
          },
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    expect(wrapper.get('[data-testid="search-scoring-study-guide-row"]').text()).toContain(
      '서버 설명: BM25는 term frequency와 field length를 함께 보는 원문 관련도다.'
    )
  })

  it('should summarize applied count and boost for each scoring study guide category', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: '점수 계열별 적용 개수와 boost 합계를 비교한다',
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
            field: 'content',
            category: 'BM25_TEXT',
            label: '본문 원문',
            boost: 1,
            keyword: '코프링',
            description: '본문 원문 match는 제목보다 넓은 recall을 담당한다.',
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
        ],
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    const guideContributions = wrapper
      .findAll('[data-testid="search-scoring-study-guide-contribution"]')
      .map(row => row.text())
    expect(guideContributions).toEqual([
      '적용 2/2개 · 적용 boost 4.00',
      '적용 0/1개 · 적용 boost 0.00',
      '이번 응답 signal 없음',
      '이번 응답 signal 없음',
    ])
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

  it('should render the final score formula as a learning explanation', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: 'Elasticsearch score 계산식을 학습용으로 보여준다',
        display: true,
        score: 12.3456,
        highlights: {},
        scoringSignals: [],
        scoreExplanation: {
          formula: 'final_score = bm25_text_score + syllable_recall_score + initial_recall_score + function_score_bonus',
          finalScore: 12.3456,
          appliedSignalCount: 2,
          totalSignalCount: 7,
          functionScoreApplied: true,
          description: 'Elasticsearch 최종 점수는 BM25 기반 텍스트 관련도에 음절/초성 recall 신호와 공지 가산점을 더한 값이다.',
        },
      },
    ])

    const wrapper = mountSearchResults()
    await flushPromises()

    expect(wrapper.get('[data-testid="score-explanation"]').text()).toBe(
      '점수 공식 final_score = bm25_text_score + syllable_recall_score + initial_recall_score + function_score_bonus · 최종 12.35 · 적용 2/7개 · 공지 가산점 적용'
    )
    expect(wrapper.get('[data-testid="score-explanation-description"]').text()).toBe(
      'Elasticsearch 최종 점수는 BM25 기반 텍스트 관련도에 음절/초성 recall 신호와 공지 가산점을 더한 값이다.'
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

  it('should compare applied boost contribution by scoring signal family', async () => {
    mockedPostSearchService.search.mockResolvedValue([
      {
        postId: 7,
        title: '코프링 검색 구현',
        contentPreview: '계열별로 검색 점수 신호를 비교한다',
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
            field: 'content',
            category: 'BM25_TEXT',
            label: '본문 원문',
            boost: 1,
            keyword: '코프링',
            description: '본문 원문 match는 제목보다 넓은 recall을 담당한다.',
            applied: false,
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
            field: 'contentSyllables',
            category: 'SYLLABLE_RECALL',
            label: '본문 음절',
            boost: 0.5,
            keyword: 'ㅋ ㅗ ㅍ ㅡ ㄹ ㅣ ㅇ',
            description: '음절 분해 본문 필드는 넓게 찾되 원문 점수를 넘지 않게 낮게 둔다.',
            applied: false,
          },
          {
            field: 'titleInitials',
            category: 'INITIAL_RECALL',
            label: '제목 초성',
            boost: 1,
            keyword: 'ㅋ ㅍ ㄹ',
            description: '제목 초성 필드는 ㅋㅌㄹ 같은 초성 입력을 위한 보조 신호다.',
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

    const rows = wrapper.findAll('[data-testid="score-family-comparison-row"]').map(row => row.text())
    expect(rows).toEqual([
      'BM25_TEXT 적용 1/2개 · 적용 boost 3.00',
      'SYLLABLE_RECALL 적용 1/2개 · 적용 boost 1.50',
      'INITIAL_RECALL 적용 0/1개 · 적용 boost 0.00',
      'FUNCTION_SCORE 적용 1/1개 · 적용 boost 2.00',
    ])
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

  it('should explain that hidden posts are excluded when a searched keyword has no results', async () => {
    mockedPostSearchService.search.mockResolvedValue([])

    const wrapper = mountSearchResults()
    await flushPromises()

    expect(wrapper.text()).toContain('검색 결과가 없습니다.')
    expect(wrapper.get('[data-testid="search-empty-study-note"]').text()).toBe(
      '검색어는 실시간 랭킹에 기록되지만, 관리자 숨김 또는 삭제 처리된 게시글은 display=true 필터 때문에 결과에서 제외됩니다.'
    )
  })

  it('should suggest BM25 syllable and initial search strategies when no result matches', async () => {
    mockedPostSearchService.search.mockResolvedValue([])

    const wrapper = mountSearchResults()
    await flushPromises()

    expect(wrapper.get('[data-testid="search-empty-strategy-note"]').text()).toBe(
      '원문 단어가 안 잡히면 핵심 단어를 줄이거나, 코프링처럼 음절 일부 또는 ㅋㅍㄹ 같은 초성으로 다시 검색해 보세요.'
    )
  })

  it('should notify search ranking refresh after a successful search request', async () => {
    const rankingRefreshListener = jest.fn()
    const unsubscribe = onSearchRankingChanged(rankingRefreshListener)
    mockedPostSearchService.search.mockResolvedValue([])

    try {
      mountSearchResults()
      await flushPromises()

      expect(rankingRefreshListener).toBeCalledTimes(1)
    } finally {
      unsubscribe()
    }
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
