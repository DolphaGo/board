import {createApp} from 'vue'
import App from './App.vue'
import VCalendar from 'v-calendar'
import {router} from './router'
import VueLoaders from 'vue-loaders'

import registerGlobalComponents from './plugins/global-components'

import 'v-calendar/dist/style.css'
import 'vue-loaders/dist/vue-loaders.css'

async function bootstrapApplication(locale, mainDiv): Promise<void> {
  const app = createApp(App)
  app.use(router)
  app.use(VCalendar, {})
  app.use(VueLoaders)
  registerGlobalComponents(app)
  app.mount(mainDiv)
}

bootstrapApplication(navigator.language, '#app').then().catch(err => console.log(err))
