import {createRouter, createWebHashHistory, RouteParams} from 'vue-router'
import BoardList from './components/BoardList.vue'
import PostDetail from './components/PostDetail.vue'

export type AppRouteNames = ''

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: BoardList },
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
