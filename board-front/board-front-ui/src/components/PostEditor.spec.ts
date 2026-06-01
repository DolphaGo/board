import { flushPromises, mount } from '@vue/test-utils'
import { postService } from 'src/api/postService'
import PostEditor from './PostEditor.vue'

const push = jest.fn()

jest.mock('vue-router', () => ({
  useRouter: () => ({
    push,
  }),
}))

jest.mock('src/api/postService', () => ({
  postService: {
    createPost: jest.fn(),
  },
}))

const mockedPostService = postService as jest.Mocked<typeof postService>

describe('# Post editor component', () => {
  beforeEach(() => {
    push.mockClear()
    mockedPostService.createPost.mockReset()
  })

  it('should add image URLs in order and submit them with the post body', async () => {
    mockedPostService.createPost.mockResolvedValue({
      id: 77,
      title: '이미지 글쓰기',
      content: '본문과 이미지 URL을 함께 저장한다',
      imageUrls: ['https://cdn.example.com/first.png', 'https://cdn.example.com/second.png'],
      viewCount: 0,
      display: true,
      notice: false,
    })
    const wrapper = mount(PostEditor)

    await wrapper.get('#issue-title').setValue('이미지 글쓰기')
    await wrapper.get('#issue-body').setValue('본문과 이미지 URL을 함께 저장한다')
    await wrapper.get('[data-testid="image-url-input"]').setValue(' https://cdn.example.com/first.png ')
    await wrapper.get('[data-testid="add-image-url"]').trigger('click')
    await wrapper.get('[data-testid="image-url-input"]').setValue('https://cdn.example.com/second.png')
    await wrapper.get('[data-testid="add-image-url"]').trigger('click')
    await wrapper.get('[data-testid="post-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.image-url-item')).toHaveLength(2)
    expect(mockedPostService.createPost).toBeCalledWith({
      title: '이미지 글쓰기',
      content: '본문과 이미지 URL을 함께 저장한다',
      imageUrls: ['https://cdn.example.com/first.png', 'https://cdn.example.com/second.png'],
    })
    expect(push).toBeCalledWith('/post/77')
  })
})
