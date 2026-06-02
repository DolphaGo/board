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
})
