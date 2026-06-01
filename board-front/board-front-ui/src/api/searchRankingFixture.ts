import type { SearchRankingItem } from './searchRankingService'

const baseRankings: SearchRankingItem[] = [
  { keyword: 'kotlin spring', score: 12 },
  { keyword: 'elasticsearch nori', score: 8 },
  { keyword: '실시간 검색어', score: 5 },
  { keyword: '게시판 채팅', score: 3 },
]

export const createSearchRankingFixture = (limit: number): SearchRankingItem[] => {
  return baseRankings.slice(0, Math.max(0, limit))
}
