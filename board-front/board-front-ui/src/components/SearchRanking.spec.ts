import { mount } from '@vue/test-utils'
import SearchRanking from './SearchRanking.vue'

const fetchRankings = jest.fn()
const routerPush = jest.fn()
const unsubscribeSearchRankingChanged = jest.fn()
let mockSearchRankingChangedListener: (() => void) | undefined
let mockRankings: Array<{ keyword: string; score: number; scoreDescription: string }> = []

jest.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

jest.mock('./useSearchRanking', () => {
  const { ref } = require('vue')

  return {
    createSearchRanking: () => ({
      rankings: ref(mockRankings),
      loading: ref(false),
      error: ref(false),
      lastUpdatedAt: ref(null),
      fetchRankings,
    }),
  }
})

jest.mock('./searchRankingRefreshEvent', () => ({
  onSearchRankingChanged: jest.fn(listener => {
    mockSearchRankingChangedListener = listener

    return unsubscribeSearchRankingChanged
  }),
}))

describe('# Search ranking component', function () {
  beforeEach(() => {
    jest.useFakeTimers()
    routerPush.mockReset()
    fetchRankings.mockClear()
    unsubscribeSearchRankingChanged.mockClear()
    mockSearchRankingChangedListener = undefined
    mockRankings = []
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should explain how real-time ranking is recorded and refreshed', function () {
    const wrapper = mount(SearchRanking)

    expect(wrapper.get('[data-testid="ranking-study-note"]').text()).toBe(
      '검색창에서 검색한 키워드를 서버가 랭킹 점수로 기록하고, 화면은 30초마다 다시 읽거나 새 검색 성공 이벤트 때 즉시 갱신합니다.'
    )

    wrapper.unmount()
  })

  it('should show the realtime ranking pipeline as study steps', function () {
    const wrapper = mount(SearchRanking)

    const steps = wrapper.findAll('[data-testid="ranking-flow-step"]').map(step => step.text())
    expect(steps).toEqual([
      '1. 기록: 검색 성공 시 정규화된 검색어를 Redis ZSET 점수 +1로 저장',
      '2. 집계: /api/search/rankings가 ZSET을 높은 점수순으로 읽어 상위 키워드 반환',
      '3. 갱신: 30초 polling 또는 검색 성공 이벤트가 사이드바 순위를 다시 조회',
    ])

    wrapper.unmount()
  })

  it('should label ranking scores as search counts', function () {
    mockRankings = [
      {
        keyword: 'kotlin spring',
        score: 7,
        scoreDescription: 'Redis ZSET score는 정규화된 검색어가 기록된 횟수입니다.',
      },
    ]

    const wrapper = mount(SearchRanking)

    expect(wrapper.get('.rank-keyword').text()).toBe('kotlin spring')
    expect(wrapper.get('[data-testid="rank-score-count"]').text()).toBe('검색 7회')
    expect(wrapper.get('[data-testid="rank-score-description"]').text()).toBe(
      'Redis ZSET score는 정규화된 검색어가 기록된 횟수입니다.'
    )

    wrapper.unmount()
  })

  it('should show immediate refresh feedback when a search ranking event arrives', async function () {
    const wrapper = mount(SearchRanking)

    expect(wrapper.find('[data-testid="ranking-live-refresh-feedback"]').exists()).toBe(false)

    mockSearchRankingChangedListener?.()
    await wrapper.vm.$nextTick()

    expect(fetchRankings).toBeCalledTimes(2)
    expect(wrapper.get('[data-testid="ranking-live-refresh-feedback"]').text()).toBe(
      '방금 검색어가 기록되어 순위를 다시 읽었습니다.'
    )

    wrapper.unmount()
  })

  it('should search with the clicked ranked keyword', async function () {
    mockRankings = [
      {
        keyword: 'kotlin spring',
        score: 7,
        scoreDescription: 'Redis ZSET score는 정규화된 검색어가 기록된 횟수입니다.',
      },
    ]
    const wrapper = mount(SearchRanking)

    await wrapper.get('[data-testid="ranking-keyword-search"]').trigger('click')

    expect(routerPush).toBeCalledWith({
      path: '/search',
      query: {
        keyword: 'kotlin spring',
        source: 'ranking',
      },
    })
    expect(wrapper.get('[data-testid="ranking-click-feedback"]').text()).toBe(
      '랭킹 키워드 "kotlin spring"로 검색 결과를 열었습니다. 검색 결과 API가 성공하면 같은 키워드가 다시 랭킹 기록 이벤트로 이어집니다.'
    )

    wrapper.unmount()
  })
})
