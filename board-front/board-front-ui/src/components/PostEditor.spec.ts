import { flushPromises, mount } from '@vue/test-utils'
import { request } from 'src'
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

jest.mock('src', () => ({
  request: {
    postForm: jest.fn(),
  },
}))

const mockedPostService = postService as jest.Mocked<typeof postService>
const mockedRequest = request as jest.Mocked<typeof request>

describe('# Post editor component', () => {
  beforeEach(() => {
    push.mockClear()
    mockedRequest.postForm.mockReset()
    mockedPostService.createPost.mockReset()
  })

  it('should append image URL markdown in order and submit them with the post body', async () => {
    mockedPostService.createPost.mockResolvedValue({
      id: 77,
      title: '이미지 글쓰기',
      content:
        '본문과 이미지 URL을 함께 저장한다\n' +
        '![첨부 이미지 1](https://cdn.example.com/first.png)\n' +
        '![첨부 이미지 2](https://cdn.example.com/second.png)\n',
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
      content:
        '본문과 이미지 URL을 함께 저장한다\n' +
        '![첨부 이미지 1](https://cdn.example.com/first.png)\n' +
        '![첨부 이미지 2](https://cdn.example.com/second.png)\n',
      imageUrls: ['https://cdn.example.com/first.png', 'https://cdn.example.com/second.png'],
    })
    expect(push).toBeCalledWith('/post/77')
  })

  it('should upload pasted images and submit the returned image URL', async () => {
    mockedRequest.postForm.mockResolvedValue({
      data: {
        url: '/api/images/stored.png',
      },
    })
    mockedPostService.createPost.mockResolvedValue({
      id: 88,
      title: '붙여넣기 이미지',
      content: '본문',
      imageUrls: ['/api/images/stored.png'],
      viewCount: 0,
      display: true,
      notice: false,
    })
    const wrapper = mount(PostEditor)
    const imageFile = new File(['image-bytes'], 'stored.png', { type: 'image/png' })

    await wrapper.get('#issue-title').setValue('붙여넣기 이미지')
    await wrapper.get('#issue-body').setValue('본문')
    await wrapper.get('#issue-body').trigger('paste', {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => imageFile,
          },
        ],
      },
    })
    await flushPromises()
    await wrapper.get('[data-testid="post-submit"]').trigger('click')
    await flushPromises()

    expect(mockedRequest.postForm).toBeCalledWith('/images', expect.any(FormData))
    expect(mockedPostService.createPost).toBeCalledWith({
      title: '붙여넣기 이미지',
      content: '본문\n![첨부 이미지 1](/api/images/stored.png)\n',
      imageUrls: ['/api/images/stored.png'],
    })
    expect(push).toBeCalledWith('/post/88')
  })

  it('should show a user-facing message when pasted image upload fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockedRequest.postForm.mockRejectedValue(new Error('이미지는 5MB까지만 업로드할 수 있습니다.'))
    const wrapper = mount(PostEditor)
    const imageFile = new File(['image-bytes'], 'large.png', { type: 'image/png' })

    await wrapper.get('#issue-body').trigger('paste', {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => imageFile,
          },
        ],
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="image-upload-message"]').text()).toContain(
      '이미지 업로드에 실패했습니다.',
    )
    expect(wrapper.get('[data-testid="image-upload-message"]').text()).toContain(
      'PNG, JPEG, GIF, WebP 이미지만 업로드할 수 있고 5MB까지 가능합니다.',
    )
    expect(wrapper.text()).not.toContain('large.png')
    expect(mockedPostService.createPost).not.toBeCalled()
    expect(consoleError).toBeCalledWith('Image upload failed', expect.any(Error))

    consoleError.mockRestore()
  })

  it('should show uploading state and ignore duplicate paste while an image upload is running', async () => {
    let finishUpload: (value: { data: { url: string } }) => void = () => undefined
    mockedRequest.postForm.mockReturnValue(
      new Promise(resolve => {
        finishUpload = resolve
      }),
    )
    const wrapper = mount(PostEditor)
    const imageFile = new File(['image-bytes'], 'uploading.png', { type: 'image/png' })
    const pasteImage = () =>
      wrapper.get('#issue-body').trigger('paste', {
        clipboardData: {
          items: [
            {
              type: 'image/png',
              getAsFile: () => imageFile,
            },
          ],
        },
      })

    await pasteImage()
    await pasteImage()

    expect(wrapper.get('[data-testid="image-upload-message"]').text()).toContain('이미지 업로드 중입니다.')
    expect(mockedRequest.postForm).toBeCalledTimes(1)

    finishUpload({
      data: {
        url: '/api/images/uploading.png',
      },
    })
    await flushPromises()

    expect(wrapper.findAll('.image-url-item')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('이미지 업로드 중입니다.')
    expect(wrapper.get('#issue-body').element).toHaveProperty(
      'value',
      '![첨부 이미지 1](/api/images/uploading.png)\n',
    )
  })

  it('should expose notice checkbox only for admin editor and submit notice flag', async () => {
    mockedPostService.createPost.mockResolvedValue({
      id: 99,
      title: '공지 작성',
      content: '운영 공지',
      imageUrls: [],
      viewCount: 0,
      display: true,
      notice: true,
    })
    const normalWrapper = mount(PostEditor)

    expect(normalWrapper.find('[data-testid="notice-checkbox"]').exists()).toBe(false)

    const adminWrapper = mount(PostEditor, {
      props: {
        authorRole: 'admin',
      },
    })
    await adminWrapper.get('#issue-title').setValue('공지 작성')
    await adminWrapper.get('#issue-body').setValue('운영 공지')
    await adminWrapper.get('[data-testid="notice-checkbox"]').setValue(true)
    await adminWrapper.get('[data-testid="post-submit"]').trigger('click')
    await flushPromises()

    expect(mockedPostService.createPost).toBeCalledWith({
      title: '공지 작성',
      content: '운영 공지',
      imageUrls: [],
      notice: true,
    })
    expect(push).toBeCalledWith('/post/99')
  })

  it('should switch editor role in the form and reset notice when switching back to user', async () => {
    mockedPostService.createPost.mockResolvedValue({
      id: 100,
      title: '일반 글',
      content: '공지 아님',
      imageUrls: [],
      viewCount: 0,
      display: true,
      notice: false,
    })
    const wrapper = mount(PostEditor)

    expect(wrapper.find('[data-testid="notice-checkbox"]').exists()).toBe(false)

    await wrapper.get('[data-testid="role-admin"]').trigger('click')
    await wrapper.get('[data-testid="notice-checkbox"]').setValue(true)
    await wrapper.get('[data-testid="role-user"]').trigger('click')
    await wrapper.get('#issue-title').setValue('일반 글')
    await wrapper.get('#issue-body').setValue('공지 아님')
    await wrapper.get('[data-testid="post-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="notice-checkbox"]').exists()).toBe(false)
    expect(mockedPostService.createPost).toBeCalledWith({
      title: '일반 글',
      content: '공지 아님',
      imageUrls: [],
    })
  })

  it('should show backend permission error when notice creation is rejected', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockedPostService.createPost.mockRejectedValue({
      response: {
        status: 400,
        data: {
          message: '공지 게시글은 관리자만 작성할 수 있습니다.',
        },
      },
    })
    const wrapper = mount(PostEditor, {
      props: {
        authorRole: 'admin',
      },
    })

    await wrapper.get('#issue-title').setValue('공지 작성')
    await wrapper.get('#issue-body').setValue('권한 없는 공지')
    await wrapper.get('[data-testid="notice-checkbox"]').setValue(true)
    await wrapper.get('[data-testid="post-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="submit-message"]').text()).toBe(
      '공지 게시글은 관리자만 작성할 수 있습니다.',
    )
    expect(push).not.toBeCalled()
    expect(consoleError).toBeCalledWith('Post submit failed', expect.any(Object))

    consoleError.mockRestore()
  })
})
