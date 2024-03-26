import {createRouter, createWebHashHistory, RouteParams} from 'vue-router'

export type AppRouteNames = ''

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [],
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
