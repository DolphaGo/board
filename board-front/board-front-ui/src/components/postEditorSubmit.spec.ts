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
      createPost,
      moveToPostDetail,
    })

    expect(createPost).toBeCalledWith({
      title: '코프링 게시글',
      content: '작성 후 상세 화면으로 이동한다',
    })
    expect(moveToPostDetail).toBeCalledWith(77)
    expect(message).toBe('게시글 #77 저장 완료')
  })
})
