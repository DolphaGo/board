import {
  createLocalHiddenPostsFixture,
  createLocalNoticePostsFixture,
  createLocalPostCommentsFixture,
  createLocalPostFixture,
  createLocalPostListPageFixture,
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

  it('should create a valid PostListPageResponse shaped fixture for Vite-only post list', () => {
    expect(createLocalPostListPageFixture({ page: 1, size: 3 })).toEqual({
      items: [
        expect.objectContaining({
          id: 999,
          imageUrls: [],
          display: true,
          notice: false,
          authorNickname: '로컬 학습유저',
          commentCount: 0,
          recommendCount: 0,
        }),
      ],
      page: 1,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    })
  })

  it('should create notice and hidden list fixtures as list item arrays', () => {
    expect(createLocalNoticePostsFixture()).toEqual([
      expect.objectContaining({
        notice: true,
        display: true,
        authorNickname: '로컬 관리자',
      }),
    ])
    expect(createLocalHiddenPostsFixture()).toEqual([
      expect.objectContaining({
        notice: false,
        display: false,
        authorNickname: '로컬 관리자',
      }),
    ])
  })

  it('should distinguish post detail and comment list paths under /api/posts', () => {
    expect(parseLocalPostRequestPath('/?page=1&size=10')).toEqual({
      kind: 'list',
      page: 1,
      size: 10,
    })
    expect(parseLocalPostRequestPath('/notices')).toEqual({
      kind: 'notices',
    })
    expect(parseLocalPostRequestPath('/hidden?actorMemberId=1')).toEqual({
      kind: 'hidden',
    })
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
