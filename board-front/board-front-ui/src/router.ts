import {createRouter, createWebHashHistory, RouteParams} from 'vue-router'
import Homepage from './components/Homepage.vue'
import PostDetail from './components/PostDetail.vue'
import PostEditor from "./components/PostEditor.vue";

export type AppRouteNames = ''

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Homepage },
    { path: '/post/edit', component: PostEditor },
    { path: '/post/:id', component: PostDetail }
  ],
})

export function routerPush(name: AppRouteNames, params?: RouteParams): ReturnType<typeof router.push> {
  if (params !== undefined) {
    return router.push({
      name,
      params,
    })
  } else {
    return router.push({name})
  }
}
