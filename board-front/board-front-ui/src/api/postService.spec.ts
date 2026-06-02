import axios from 'axios'
import { postService } from './postService'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('# Post service', function () {
  it('should fetch a post by id', async function () {
    mockedAxios.get.mockResolvedValue({
      data: {
        id: 10,
        title: '코프링 게시글',
        content: 'Elasticsearch 색인까지 연결한다',
        imageUrls: ['https://cdn.example.com/first.png'],
        viewCount: 3,
        display: true,
        notice: false,
      },
    })

    const post = await postService.getPost(10)

    expect(mockedAxios.get).toBeCalledWith('/api/posts/10')
    expect(post.title).toBe('코프링 게시글')
  })

  it('should fetch visible posts as a list', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 10,
          title: '코프링 게시글',
          content: 'Elasticsearch 색인까지 연결한다',
          imageUrls: [],
          viewCount: 3,
          display: true,
          notice: true,
          authorNickname: 'writer',
          createdAt: '2026-06-02T04:00:00',
          commentCount: 2,
          recommendCount: 1,
        },
      ],
    })

    const posts = await postService.listPosts()

    expect(mockedAxios.get).toBeCalledWith('/api/posts')
    expect(posts).toHaveLength(1)
    expect(posts[0].title).toBe('코프링 게시글')
    expect(posts[0].notice).toBe(true)
    expect(posts[0].authorNickname).toBe('writer')
    expect(posts[0].commentCount).toBe(2)
  })

  it('should ignore hidden posts when the list API returns mixed display states', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 10,
          title: '보이는 게시글',
          content: '목록에 남아야 한다',
          imageUrls: [],
          viewCount: 3,
          display: true,
          notice: false,
          authorNickname: 'writer',
          createdAt: '2026-06-02T04:00:00',
          commentCount: 2,
          recommendCount: 1,
        },
        {
          id: 11,
          title: '숨김 게시글',
          content: '목록에서 가려야 한다',
          imageUrls: [],
          viewCount: 1,
          display: false,
          notice: false,
          authorNickname: 'admin',
          createdAt: '2026-06-02T05:00:00',
          commentCount: 0,
          recommendCount: 0,
        },
      ],
    })

    const posts = await postService.listPosts()

    expect(posts).toHaveLength(1)
    expect(posts[0].title).toBe('보이는 게시글')
  })

  it('should fetch visible notice posts from the post list API', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 10,
          title: '점검 공지',
          content: '서비스 점검 시간 안내',
          imageUrls: [],
          viewCount: 12,
          display: true,
          notice: true,
          authorNickname: 'admin',
          createdAt: '2026-06-02T04:00:00',
          commentCount: 1,
          recommendCount: 4,
        },
        {
          id: 11,
          title: '일반 게시글',
          content: '공지 목록에는 나오면 안 된다',
          imageUrls: [],
          viewCount: 3,
          display: true,
          notice: false,
          authorNickname: 'writer',
          createdAt: '2026-06-02T05:00:00',
          commentCount: 0,
          recommendCount: 0,
        },
        {
          id: 12,
          title: '숨김 공지',
          content: '숨김 공지는 공지 목록에도 나오면 안 된다',
          imageUrls: [],
          viewCount: 1,
          display: false,
          notice: true,
          authorNickname: 'admin',
          createdAt: '2026-06-02T06:00:00',
          commentCount: 0,
          recommendCount: 0,
        },
      ],
    })

    const posts = await postService.listNoticePosts()

    expect(mockedAxios.get).toBeCalledWith('/api/posts/notices')
    expect(posts).toHaveLength(1)
    expect(posts[0].title).toBe('점검 공지')
    expect(posts[0].notice).toBe(true)
    expect(posts[0].display).toBe(true)
  })

  it('should fetch hidden posts with the study admin member id', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 10,
          title: '숨김 게시글',
          content: '관리자가 복구할 대상',
          imageUrls: [],
          viewCount: 3,
          display: false,
          notice: false,
          authorNickname: 'writer',
          createdAt: '2026-06-02T04:00:00',
          commentCount: 2,
          recommendCount: 5,
        },
      ],
    })

    const posts = await postService.listHiddenPosts()

    expect(mockedAxios.get).toBeCalledWith('/api/posts/hidden', {
      params: {
        actorMemberId: 1,
      },
    })
    expect(posts).toHaveLength(1)
    expect(posts[0].display).toBe(false)
  })

  it('should ignore visible posts when the hidden list API returns mixed display states', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 10,
          title: '숨김 게시글',
          content: '관리자가 복구할 대상',
          imageUrls: [],
          viewCount: 3,
          display: false,
          notice: false,
          authorNickname: 'writer',
          createdAt: '2026-06-02T04:00:00',
          commentCount: 2,
          recommendCount: 5,
        },
        {
          id: 11,
          title: '복구된 게시글',
          content: '숨김 목록에는 보이면 안 된다',
          imageUrls: [],
          viewCount: 1,
          display: true,
          notice: false,
          authorNickname: 'admin',
          createdAt: '2026-06-02T05:00:00',
          commentCount: 0,
          recommendCount: 0,
        },
      ],
    })

    const posts = await postService.listHiddenPosts()

    expect(posts).toHaveLength(1)
    expect(posts[0].title).toBe('숨김 게시글')
  })

  it('should create a post with the study user member id by default', async function () {
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 10,
        title: '코프링 게시글',
        content: 'Elasticsearch 색인까지 연결한다',
        imageUrls: ['https://cdn.example.com/first.png', 'https://cdn.example.com/second.png'],
        viewCount: 0,
        display: true,
        notice: false,
      },
    })

    const post = await postService.createPost({
      title: '코프링 게시글',
      content: 'Elasticsearch 색인까지 연결한다',
      imageUrls: ['https://cdn.example.com/first.png', 'https://cdn.example.com/second.png'],
    })

    expect(mockedAxios.post).toBeCalledWith('/api/posts', {
      memberId: 2,
      title: '코프링 게시글',
      content: 'Elasticsearch 색인까지 연결한다',
      imageUrls: ['https://cdn.example.com/first.png', 'https://cdn.example.com/second.png'],
      notice: false,
    })
    expect(post.id).toBe(10)
    expect(post.imageUrls).toEqual(['https://cdn.example.com/first.png', 'https://cdn.example.com/second.png'])
  })

  it('should create an admin notice post with the study admin member id', async function () {
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 11,
        title: '점검 공지',
        content: '관리자가 공지를 작성한다',
        imageUrls: [],
        viewCount: 0,
        display: true,
        notice: true,
      },
    })

    await postService.createPost({
      title: '점검 공지',
      content: '관리자가 공지를 작성한다',
      notice: true,
      actorRole: 'admin',
    })

    expect(mockedAxios.post).toBeCalledWith('/api/posts', {
      memberId: 1,
      title: '점검 공지',
      content: '관리자가 공지를 작성한다',
      imageUrls: [],
      notice: true,
    })
  })

  it('should create a comment with the study user member id', async function () {
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 20,
        postId: 10,
        memberId: 2,
        authorNickname: 'writer',
        content: '검색 스코어링 설명이 좋아요',
        display: true,
        createdAt: '2026-06-02T04:10:00',
      },
    })

    const comment = await postService.createComment(10, {
      content: '검색 스코어링 설명이 좋아요',
    })

    expect(mockedAxios.post).toBeCalledWith('/api/posts/10/comments', {
      memberId: 2,
      content: '검색 스코어링 설명이 좋아요',
    })
    expect(comment.id).toBe(20)
    expect(comment.authorNickname).toBe('writer')
  })

  it('should fetch visible comments for a post', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 20,
          postId: 10,
          memberId: 1,
          authorNickname: 'writer',
          content: '첫 댓글',
          display: true,
          createdAt: '2026-06-02T04:10:00',
        },
      ],
    })

    const comments = await postService.listComments(10)

    expect(mockedAxios.get).toBeCalledWith('/api/posts/10/comments')
    expect(comments).toHaveLength(1)
    expect(comments[0].content).toBe('첫 댓글')
  })

  it('should create a recommendation with the study user member id', async function () {
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 30,
        postId: 10,
        memberId: 2,
        display: true,
        createdAt: '2026-06-02T04:12:00',
      },
    })

    const recommend = await postService.createRecommend(10)

    expect(mockedAxios.post).toBeCalledWith('/api/posts/10/recommends', {
      memberId: 2,
    })
    expect(recommend.id).toBe(30)
    expect(recommend.display).toBe(true)
  })

  it('should hide a post with the study admin member id', async function () {
    mockedAxios.patch.mockResolvedValue({
      data: {
        id: 10,
        title: '숨김 게시글',
        content: '관리자가 숨긴다',
        imageUrls: [],
        viewCount: 3,
        display: false,
        notice: false,
      },
    })

    const post = await postService.hidePost(10)

    expect(mockedAxios.patch).toBeCalledWith('/api/posts/10/hide', {
      actorMemberId: 1,
    })
    expect(post.display).toBe(false)
  })

  it('should restore a post with the study admin member id', async function () {
    mockedAxios.patch.mockResolvedValue({
      data: {
        id: 10,
        title: '복구 게시글',
        content: '관리자가 복구한다',
        imageUrls: [],
        viewCount: 3,
        display: true,
        notice: false,
      },
    })

    const post = await postService.restorePost(10)

    expect(mockedAxios.patch).toBeCalledWith('/api/posts/10/restore', {
      actorMemberId: 1,
    })
    expect(post.display).toBe(true)
  })

  it('should reject malformed create post responses', async function () {
    mockedAxios.post.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(postService.createPost({
      title: '코프링 게시글',
      content: 'Elasticsearch 색인까지 연결한다',
    })).rejects.toThrow('Invalid post response')
  })

  it('should reject malformed get post responses', async function () {
    mockedAxios.get.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(postService.getPost(10)).rejects.toThrow('Invalid post response')
  })

  it('should reject malformed list post responses', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 10,
          title: '코프링 게시글',
        },
      ],
    })

    await expect(postService.listPosts()).rejects.toThrow('Invalid post list response')
  })

  it('should reject malformed notice post list responses', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 10,
          title: '작성자와 날짜가 없는 공지',
        },
      ],
    })

    await expect(postService.listNoticePosts()).rejects.toThrow('Invalid notice post list response')
  })

  it('should reject malformed hidden post list responses', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 10,
          title: '작성자와 날짜가 없는 숨김 게시글',
        },
      ],
    })

    await expect(postService.listHiddenPosts()).rejects.toThrow('Invalid hidden post list response')
  })

  it('should reject malformed list comment responses', async function () {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 20,
          content: '작성자와 날짜가 없는 댓글',
        },
      ],
    })

    await expect(postService.listComments(10)).rejects.toThrow('Invalid comment list response')
  })

  it('should reject malformed create comment responses', async function () {
    mockedAxios.post.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(postService.createComment(10, {
      content: '검색 스코어링 설명이 좋아요',
    })).rejects.toThrow('Invalid comment response')
  })

  it('should reject malformed create recommend responses', async function () {
    mockedAxios.post.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(postService.createRecommend(10)).rejects.toThrow('Invalid recommend response')
  })

  it('should reject malformed hide post responses', async function () {
    mockedAxios.patch.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(postService.hidePost(10)).rejects.toThrow('Invalid post response')
  })

  it('should reject malformed restore post responses', async function () {
    mockedAxios.patch.mockResolvedValue({
      data: '<html>vite fallback</html>',
    })

    await expect(postService.restorePost(10)).rejects.toThrow('Invalid post response')
  })
})
