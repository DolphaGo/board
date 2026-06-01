import axios from 'axios'
import { postService } from './postService'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('# Post service', function () {
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
})
