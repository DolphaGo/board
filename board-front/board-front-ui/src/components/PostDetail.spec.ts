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
  },
}))

const mockedPostService = postService as jest.Mocked<typeof postService>

describe('# Post detail component', () => {
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
})
