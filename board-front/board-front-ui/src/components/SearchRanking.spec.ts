import { mount } from '@vue/test-utils'
import SearchRanking from './SearchRanking.vue'

const fetchRankings = jest.fn()
const unsubscribeSearchRankingChanged = jest.fn()

jest.mock('./useSearchRanking', () => {
  const { ref } = require('vue')

  return {
    createSearchRanking: () => ({
      rankings: ref([]),
      loading: ref(false),
      error: ref(false),
      lastUpdatedAt: ref(null),
      fetchRankings,
    }),
  }
})

jest.mock('./searchRankingRefreshEvent', () => ({
  onSearchRankingChanged: jest.fn(() => unsubscribeSearchRankingChanged),
}))

describe('# Search ranking component', function () {
  beforeEach(() => {
    jest.useFakeTimers()
    fetchRankings.mockClear()
    unsubscribeSearchRankingChanged.mockClear()
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
})
