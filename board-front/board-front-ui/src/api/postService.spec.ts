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
        viewCount: 3,
        display: true,
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
          viewCount: 3,
          display: true,
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
    expect(posts[0].authorNickname).toBe('writer')
    expect(posts[0].commentCount).toBe(2)
  })

  it('should create a post with the study member id', async function () {
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 10,
        title: '코프링 게시글',
        content: 'Elasticsearch 색인까지 연결한다',
        viewCount: 0,
        display: true,
      },
    })

    const post = await postService.createPost({
      title: '코프링 게시글',
      content: 'Elasticsearch 색인까지 연결한다',
    })

    expect(mockedAxios.post).toBeCalledWith('/api/posts', {
      memberId: 1,
      title: '코프링 게시글',
      content: 'Elasticsearch 색인까지 연결한다',
    })
    expect(post.id).toBe(10)
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
})
