import { normalizeSearchKeyword } from './normalizeSearchKeyword'

describe('# Search keyword normalizer', () => {
  it('should trim and collapse whitespace for the shared board search contract', () => {
    expect(normalizeSearchKeyword('  kotlin   spring\t게시판  ')).toBe('kotlin spring 게시판')
  })
})
