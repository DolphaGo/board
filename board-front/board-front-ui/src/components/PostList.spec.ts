import { mount } from '@vue/test-utils'
import PostList from './PostList.vue'

describe('# Post list component', () => {
  it('should render posts as dense board rows with metadata', () => {
    const wrapper = mount(PostList)
    const rows = wrapper.findAll('.board-row')

    expect(wrapper.get('h2').text()).toBe('게시글')
    expect(rows).toHaveLength(3)
    expect(rows[0].get('.board-title-link').text()).toBe('Elasticsearch 검색 스코어링 정리')
    expect(rows[0].get('.meta-row').text()).toContain('조회 128')
    expect(rows[0].get('.meta-row').text()).toContain('댓글 12')
    expect(rows[0].get('.meta-row').text()).toContain('추천 7')
  })
})
