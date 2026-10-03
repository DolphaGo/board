import { describe, expect, it, vi } from 'vitest'
import { submitPostEditorForm } from './postEditorSubmit'

describe('# Post editor submit', () => {
  it('should save the post and move to the created post detail', async () => {
    const createPost = vi.fn().mockResolvedValue({
      id: 77,
      title: '코프링 게시글',
      content: '작성 후 상세 화면으로 이동한다',
      viewCount: 0,
      display: true,
    })
    const moveToPostDetail = vi.fn()

    const message = await submitPostEditorForm({
      title: '코프링 게시글',
      content: '작성 후 상세 화면으로 이동한다',
      imageUrls: ['https://cdn.example.com/first.png'],
      createPost,
      moveToPostDetail,
    })

    expect(createPost).toHaveBeenCalledWith({
      title: '코프링 게시글',
      content: '작성 후 상세 화면으로 이동한다',
      imageUrls: ['https://cdn.example.com/first.png'],
      actorRole: 'user',
    })
    expect(moveToPostDetail).toHaveBeenCalledWith(77)
    expect(message).toBe('게시글 #77 저장 완료')
  })

  it('should forward notice flag when admin editor asks to create a notice post', async () => {
    const createPost = vi.fn().mockResolvedValue({
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
      actorRole: 'admin',
      createPost,
      moveToPostDetail: vi.fn(),
    })

    expect(createPost).toHaveBeenCalledWith({
      title: '공지',
      content: '관리자 공지',
      imageUrls: [],
      notice: true,
      actorRole: 'admin',
    })
  })
  it.each([
    ['', '본문', '제목을 입력해 주세요.'],
    ['  \n', '본문', '제목을 입력해 주세요.'],
    ['제목', '', '본문을 입력해 주세요.'],
    ['제목', ' \n\t ', '본문을 입력해 주세요.'],
    ['가'.repeat(256), '본문', '제목은 255자 이내로 입력해 주세요.'],
  ])('rejects invalid input without saving: %s', async (title, content, message) => {
    const createPost = vi.fn().mockResolvedValue({ id: 1 })
    const moveToPostDetail = vi.fn()
    expect(await submitPostEditorForm({ title, content, createPost, moveToPostDetail })).toBe(message)
    expect(createPost).not.toHaveBeenCalled()
    expect(moveToPostDetail).not.toHaveBeenCalled()
  })

  it('preserves a long Markdown body and accepts a 255-character title', async () => {
    const title = '가'.repeat(255)
    const content = '# 제목\n\n' + '긴 Markdown 본문\n'.repeat(100)
    const createPost = vi.fn().mockResolvedValue({ id: 79 })
    await submitPostEditorForm({ title, content, createPost, moveToPostDetail: vi.fn() })
    expect(createPost).toHaveBeenCalledWith({ title, content, imageUrls: [], actorRole: 'user' })
  })

})
