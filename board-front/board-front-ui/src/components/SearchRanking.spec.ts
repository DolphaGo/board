import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchRanking from './SearchRanking.vue'

const { fetchRankings, routerPush, unsubscribeSearchRankingChanged, mockState } = vi.hoisted(() => ({
  fetchRankings: vi.fn(),
  routerPush: vi.fn(),
  unsubscribeSearchRankingChanged: vi.fn(),
  mockState: {
    searchRankingChangedListener: undefined as (() => void) | undefined,
    rankings: [] as Array<{ keyword: string; score: number; scoreDescription: string }>,
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('./useSearchRanking', async () => {
  const { ref } = await import('vue')

  return {
    createSearchRanking: () => ({
      rankings: ref(mockState.rankings),
      loading: ref(false),
      error: ref(false),
      lastUpdatedAt: ref(null),
      fetchRankings,
    }),
  }
})

vi.mock('./searchRankingRefreshEvent', () => ({
  onSearchRankingChanged: vi.fn(listener => {
    mockState.searchRankingChangedListener = listener

    return unsubscribeSearchRankingChanged
  }),
}))

describe('# Search ranking component', function () {
  beforeEach(() => {
    vi.useFakeTimers()
    routerPush.mockReset()
    fetchRankings.mockClear()
    unsubscribeSearchRankingChanged.mockClear()
    mockState.searchRankingChangedListener = undefined
    mockState.rankings = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should explain how real-time ranking is recorded and refreshed', function () {
    const wrapper = mount(SearchRanking)

    expect(wrapper.get('[data-testid="ranking-study-note"]').text()).toBe(
      '검색창에서 검색한 키워드를 서버가 최근 30분 live ZSET 점수로 기록하고, 화면은 30초마다 다시 읽거나 새 검색 성공 이벤트 때 즉시 갱신합니다.'
    )

    wrapper.unmount()
  })

  it('should show the realtime ranking pipeline as study steps', function () {
    const wrapper = mount(SearchRanking)

    const steps = wrapper.findAll('[data-testid="ranking-flow-step"]').map(step => step.text())
    expect(steps).toEqual([
      '1. 기록: 검색 성공 시 정규화된 검색어를 누적 ZSET과 최근 30분 live ZSET에 함께 +1로 저장',
      '2. 집계: /api/search/rankings는 live ZSET을 높은 점수순으로 읽고, 자동완성은 누적 ZSET을 prefix/초성/음절로 필터링',
      '3. 갱신: 30초 polling 또는 검색 성공 이벤트가 사이드바의 최근 순위를 다시 조회',
    ])

    wrapper.unmount()
  })

  it('should label ranking scores as search counts', function () {
    mockState.rankings = [
      {
        keyword: 'kotlin spring',
        score: 7,
        scoreDescription: 'Redis ZSET score는 최근 30분 동안 정규화된 검색어가 기록된 횟수입니다.',
      },
    ]

    const wrapper = mount(SearchRanking)

    expect(wrapper.get('.rank-keyword').text()).toBe('kotlin spring')
    expect(wrapper.get('[data-testid="rank-score-count"]').text()).toBe('검색 7회')
    expect(wrapper.get('[data-testid="rank-score-description"]').text()).toBe(
      'Redis ZSET score는 최근 30분 동안 정규화된 검색어가 기록된 횟수입니다.'
    )

    wrapper.unmount()
  })

  it('should show immediate refresh feedback when a search ranking event arrives', async function () {
    const wrapper = mount(SearchRanking)

    expect(wrapper.find('[data-testid="ranking-live-refresh-feedback"]').exists()).toBe(false)

    mockState.searchRankingChangedListener?.()
    await wrapper.vm.$nextTick()

    expect(fetchRankings).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-testid="ranking-live-refresh-feedback"]').text()).toBe(
      '방금 검색어가 기록되어 순위를 다시 읽었습니다.'
    )

    wrapper.unmount()
  })

  it('should search with the clicked ranked keyword', async function () {
    mockState.rankings = [
      {
        keyword: 'kotlin spring',
        score: 7,
        scoreDescription: 'Redis ZSET score는 최근 30분 동안 정규화된 검색어가 기록된 횟수입니다.',
      },
    ]
    const wrapper = mount(SearchRanking)

    await wrapper.get('[data-testid="ranking-keyword-search"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
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
