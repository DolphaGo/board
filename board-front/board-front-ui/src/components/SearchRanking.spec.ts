import { mount } from '@vue/test-utils'
import SearchRanking from './SearchRanking.vue'

const fetchRankings = jest.fn()
const unsubscribeSearchRankingChanged = jest.fn()
let mockSearchRankingChangedListener: (() => void) | undefined
let mockRankings: Array<{ keyword: string; score: number }> = []

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

  it('should label ranking scores as search counts', function () {
    mockRankings = [
      { keyword: 'kotlin spring', score: 7 },
    ]

    const wrapper = mount(SearchRanking)

    expect(wrapper.get('.rank-keyword').text()).toBe('kotlin spring')
    expect(wrapper.get('.rank-score').text()).toBe('검색 7회')

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
})
