import {
  createLocalPostCommentsFixture,
  createLocalPostFixture,
  parseLocalPostRequestPath,
} from './localPostFixture'

describe('# local post API fixture', () => {
  it('should create a valid PostResponse shaped fixture for Vite-only post detail', () => {
    const post = createLocalPostFixture(999)

    expect(post).toMatchObject({
      id: 999,
      title: 'local fixture post #999',
      content: 'created by vite fixture',
      imageUrls: [],
      viewCount: 0,
      display: true,
      notice: false,
      authorNickname: '로컬 학습유저',
      commentCount: 0,
      recommendCount: 0,
    })
    expect(typeof post.createdAt).toBe('string')
  })

  it('should create a valid comment list fixture for Vite-only post detail', () => {
    expect(createLocalPostCommentsFixture()).toEqual([])
  })

  it('should distinguish post detail and comment list paths under /api/posts', () => {
    expect(parseLocalPostRequestPath('/999')).toEqual({
      kind: 'post',
      postId: 999,
    })
    expect(parseLocalPostRequestPath('/999/comments')).toEqual({
      kind: 'comments',
      postId: 999,
    })
  })
})
