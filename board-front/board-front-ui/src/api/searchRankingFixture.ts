import type { SearchRankingItem } from './searchRankingService'

const scoreDescription = 'Redis ZSET score는 최근 30분 동안 정규화된 검색어가 기록된 횟수입니다.'

const baseRankings: SearchRankingItem[] = [
  { keyword: 'kotlin spring', score: 12, scoreDescription },
  { keyword: 'elasticsearch nori', score: 8, scoreDescription },
  { keyword: '실시간 검색어', score: 5, scoreDescription },
  { keyword: '게시판 채팅', score: 3, scoreDescription },
]

export const createSearchRankingFixture = (limit: number): SearchRankingItem[] => {
  return baseRankings.slice(0, Math.max(0, limit))
}
