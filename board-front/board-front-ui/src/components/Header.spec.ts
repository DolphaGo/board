import { mount } from '@vue/test-utils'
import Header from './Header.vue'

jest.mock('vue-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

const routerLinkStub = {
  props: ['to'],
  template: '<a :data-to="to"><slot /></a>',
}

describe('# Header component', () => {
  it('should expose real router links for home and post list navigation', () => {
    const wrapper = mount(Header, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })

    const homeLink = wrapper.find('[data-to="/"][data-nav="home"]')
    const postsLink = wrapper.find('[data-to="/"][data-nav="posts"]')

    expect(homeLink.exists()).toBe(true)
    expect(homeLink.text()).toBe('Home')
    expect(postsLink.exists()).toBe(true)
    expect(postsLink.text()).toBe('Posts')
    expect(wrapper.find('a[href="#"]').exists()).toBe(false)
  })

  it('should expose a navigation link to the admin hidden post list', () => {
    const wrapper = mount(Header, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })

    const hiddenPostLink = wrapper.find('[data-to="/admin/hidden-posts"]')

    expect(hiddenPostLink.exists()).toBe(true)
    expect(hiddenPostLink.text()).toBe('숨김 관리')
  })

  it('should expose a navigation link to the post editor', () => {
    const wrapper = mount(Header, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })

    const postEditorLink = wrapper.find('[data-to="/post/edit"]')

    expect(postEditorLink.exists()).toBe(true)
    expect(postEditorLink.text()).toBe('글쓰기')
  })
})
