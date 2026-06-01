import { submitPostEditorForm } from './postEditorSubmit'

describe('# Post editor submit', () => {
  it('should save the post and move to the created post detail', async () => {
    const createPost = jest.fn().mockResolvedValue({
      id: 77,
      title: '코프링 게시글',
      content: '작성 후 상세 화면으로 이동한다',
      viewCount: 0,
      display: true,
    })
    const moveToPostDetail = jest.fn()

    const message = await submitPostEditorForm({
      title: '코프링 게시글',
      content: '작성 후 상세 화면으로 이동한다',
      imageUrls: ['https://cdn.example.com/first.png'],
      createPost,
      moveToPostDetail,
    })

    expect(createPost).toBeCalledWith({
      title: '코프링 게시글',
      content: '작성 후 상세 화면으로 이동한다',
      imageUrls: ['https://cdn.example.com/first.png'],
    })
    expect(moveToPostDetail).toBeCalledWith(77)
    expect(message).toBe('게시글 #77 저장 완료')
  })

  it('should forward notice flag when admin editor asks to create a notice post', async () => {
    const createPost = jest.fn().mockResolvedValue({
      id: 88,
      title: '공지',
      content: '관리자 공지',
      imageUrls: [],
      viewCount: 0,
      display: true,
      notice: true,
    })

    await submitPostEditorForm({
      title: '공지',
      content: '관리자 공지',
      notice: true,
      createPost,
      moveToPostDetail: jest.fn(),
    })

    expect(createPost).toBeCalledWith({
      title: '공지',
      content: '관리자 공지',
      imageUrls: [],
      notice: true,
    })
  })
})
