import { flushPromises, mount } from '@vue/test-utils'
import { postService } from 'src/api/postService'
import PostDetail from './PostDetail.vue'

const mockRoute = {
  params: {
    id: '10',
  },
}

jest.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}))

jest.mock('src/api/postService', () => ({
  postService: {
    getPost: jest.fn(),
    listComments: jest.fn(),
    createComment: jest.fn(),
    createRecommend: jest.fn(),
    hidePost: jest.fn(),
    restorePost: jest.fn(),
  },
}))

const mockedPostService = postService as jest.Mocked<typeof postService>

describe('# Post detail component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should connect comment submit and recommend click to post service', async () => {
    mockedPostService.getPost.mockResolvedValue({
      id: 10,
      title: '코프링 게시글',
      content: 'Elasticsearch 색인까지 연결한다',
      imageUrls: ['https://cdn.example.com/first.png', 'https://cdn.example.com/second.png'],
      viewCount: 3,
      display: true,
      notice: true,
    })
    mockedPostService.listComments.mockResolvedValue([
      {
        id: 19,
        postId: 10,
        memberId: 1,
        authorNickname: 'reader',
        content: '이미 저장된 댓글',
        display: true,
        createdAt: '2026-06-02T04:00:00',
      },
    ])
    mockedPostService.createComment.mockResolvedValue({
      id: 20,
      postId: 10,
      memberId: 1,
      authorNickname: 'writer',
      content: '검색 스코어링 설명이 좋아요',
      display: true,
      createdAt: '2026-06-02T04:10:00',
    })
    mockedPostService.createRecommend.mockResolvedValue({
      id: 30,
      postId: 10,
      memberId: 1,
      display: true,
      createdAt: '2026-06-02T04:12:00',
    })

    const wrapper = mount(PostDetail)
    await flushPromises()

    await wrapper.get('[data-testid="comment-content"]').setValue('검색 스코어링 설명이 좋아요')
    await wrapper.get('[data-testid="comment-submit"]').trigger('submit')
    await wrapper.get('[data-testid="recommend-button"]').trigger('click')
    await flushPromises()

    expect(mockedPostService.getPost).toBeCalledWith(10)
    expect(mockedPostService.listComments).toBeCalledWith(10)
    expect(mockedPostService.createComment).toBeCalledWith(10, {
      content: '검색 스코어링 설명이 좋아요',
    })
    expect(mockedPostService.createRecommend).toBeCalledWith(10)
    expect(wrapper.get('.notice-badge').text()).toBe('공지')
    expect(wrapper.findAll('.post-image-list img')).toHaveLength(2)
    expect(wrapper.findAll('.post-image-list img')[0].attributes('src')).toBe('https://cdn.example.com/first.png')
    expect(wrapper.findAll('.post-image-list img')[1].attributes('src')).toBe('https://cdn.example.com/second.png')
    expect(wrapper.get('[data-testid="comment-content"]').element).toHaveProperty('value', '')
    expect(wrapper.text()).toContain('이미 저장된 댓글')
    expect(wrapper.text()).toContain('검색 스코어링 설명이 좋아요')
    expect(wrapper.text()).toContain('댓글이 저장되었습니다.')
    expect(wrapper.text()).toContain('추천을 반영했습니다.')
  })

  it('should hide a visible post only when admin viewer clicks the hide button', async () => {
    mockedPostService.getPost.mockResolvedValue({
      id: 10,
      title: '숨길 게시글',
      content: '관리자만 숨김 처리한다',
      imageUrls: [],
      viewCount: 3,
      display: true,
      notice: false,
    })
    mockedPostService.listComments.mockResolvedValue([])
    mockedPostService.hidePost.mockResolvedValue({
      id: 10,
      title: '숨길 게시글',
      content: '관리자만 숨김 처리한다',
      imageUrls: [],
      viewCount: 3,
      display: false,
      notice: false,
    })

    const userWrapper = mount(PostDetail)
    await flushPromises()

    expect(userWrapper.find('[data-testid="hide-post"]').exists()).toBe(false)

    const adminWrapper = mount(PostDetail, {
      props: {
        authorRole: 'admin',
      },
    })
    await flushPromises()

    await adminWrapper.get('[data-testid="hide-post"]').trigger('click')
    await flushPromises()

    expect(mockedPostService.hidePost).toBeCalledWith(10)
    expect(adminWrapper.find('[data-testid="hide-post"]').exists()).toBe(false)
    expect(adminWrapper.get('[data-testid="post-action-message"]').text()).toBe('게시글을 숨겼습니다.')
  })

  it('should show backend hide error message for admin viewer', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    mockedPostService.getPost.mockResolvedValue({
      id: 10,
      title: '숨김 실패 게시글',
      content: '권한 오류를 안내한다',
      imageUrls: [],
      viewCount: 3,
      display: true,
      notice: false,
    })
    mockedPostService.listComments.mockResolvedValue([])
    mockedPostService.hidePost.mockRejectedValue({
      response: {
        data: {
          message: '관리자만 게시글을 숨길 수 있습니다.',
        },
      },
    })

    const wrapper = mount(PostDetail, {
      props: {
        authorRole: 'admin',
      },
    })
    await flushPromises()

    await wrapper.get('[data-testid="hide-post"]').trigger('click')
    await flushPromises()

    expect(consoleError).toBeCalledWith('게시글 숨김 실패:', expect.anything())
    expect(wrapper.get('[data-testid="post-action-error"]').text()).toBe('관리자만 게시글을 숨길 수 있습니다.')
  })

  it('should mask post content and actions when the post is hidden', async () => {
    mockedPostService.getPost.mockResolvedValue({
      id: 10,
      title: '숨김 처리된 제목',
      content: '숨김 처리된 본문',
      imageUrls: ['https://cdn.example.com/hidden.png'],
      viewCount: 3,
      display: false,
      notice: false,
    })
    mockedPostService.listComments.mockResolvedValue([
      {
        id: 19,
        postId: 10,
        memberId: 1,
        authorNickname: 'reader',
        content: '숨김 글 댓글',
        display: true,
        createdAt: '2026-06-02T04:00:00',
      },
    ])

    const wrapper = mount(PostDetail)
    await flushPromises()

    expect(wrapper.get('[data-testid="hidden-post"]').text()).toBe('숨김 처리된 게시글입니다.')
    expect(wrapper.text()).not.toContain('숨김 처리된 제목')
    expect(wrapper.text()).not.toContain('숨김 처리된 본문')
    expect(wrapper.text()).not.toContain('숨김 글 댓글')
    expect(wrapper.find('.post-image-list').exists()).toBe(false)
    expect(wrapper.find('[data-testid="recommend-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="comment-submit"]').exists()).toBe(false)
  })

  it('should restore a hidden post only when admin viewer clicks the restore button', async () => {
    mockedPostService.getPost.mockResolvedValue({
      id: 10,
      title: '복구할 제목',
      content: '복구 후 다시 본문을 보여준다',
      imageUrls: [],
      viewCount: 3,
      display: false,
      notice: false,
    })
    mockedPostService.listComments.mockResolvedValue([])
    mockedPostService.restorePost.mockResolvedValue({
      id: 10,
      title: '복구할 제목',
      content: '복구 후 다시 본문을 보여준다',
      imageUrls: [],
      viewCount: 3,
      display: true,
      notice: false,
    })

    const userWrapper = mount(PostDetail)
    await flushPromises()

    expect(userWrapper.find('[data-testid="restore-post"]').exists()).toBe(false)

    const adminWrapper = mount(PostDetail, {
      props: {
        authorRole: 'admin',
      },
    })
    await flushPromises()

    await adminWrapper.get('[data-testid="restore-post"]').trigger('click')
    await flushPromises()

    expect(mockedPostService.restorePost).toBeCalledWith(10)
    expect(adminWrapper.find('[data-testid="hidden-post"]').exists()).toBe(false)
    expect(adminWrapper.get('[data-testid="post-action-message"]').text()).toBe('게시글을 복구했습니다.')
    expect(adminWrapper.text()).toContain('복구 후 다시 본문을 보여준다')
  })

  it('should show backend restore error message for admin viewer', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    mockedPostService.getPost.mockResolvedValue({
      id: 10,
      title: '복구 실패 게시글',
      content: '권한 오류를 안내한다',
      imageUrls: [],
      viewCount: 3,
      display: false,
      notice: false,
    })
    mockedPostService.listComments.mockResolvedValue([])
    mockedPostService.restorePost.mockRejectedValue({
      response: {
        data: {
          message: '게시글 복구는 관리자만 할 수 있습니다.',
        },
      },
    })

    const wrapper = mount(PostDetail, {
      props: {
        authorRole: 'admin',
      },
    })
    await flushPromises()

    await wrapper.get('[data-testid="restore-post"]').trigger('click')
    await flushPromises()

    expect(consoleError).toBeCalledWith('게시글 복구 실패:', expect.anything())
    expect(wrapper.get('[data-testid="post-action-error"]').text()).toBe('게시글 복구는 관리자만 할 수 있습니다.')
  })
})
