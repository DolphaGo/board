import {createRouter, createWebHashHistory, RouteParams} from 'vue-router'
import Homepage from './components/Homepage.vue'
import PostDetail from './components/PostDetail.vue'
import PostEditor from "./components/PostEditor.vue";
import SearchResults from './components/SearchResults.vue'

export type AppRouteNames = ''

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Homepage },
    { path: '/search', component: SearchResults },
    { path: '/post/edit', component: PostEditor },
    { path: '/post/:id', component: PostDetail },
    {
      path: '/chat/rooms',
      // 채팅 화면은 SockJS/STOMP처럼 브라우저 전역에 민감한 의존성을 가진다.
      // 홈 화면에서 채팅 번들을 미리 실행하지 않도록 라우트에 들어갈 때만 불러온다.
      component: () => import('./components/chat/ChatRoomList.vue'),
    },
    {
      path: '/chat/rooms/:id',
      component: () => import('./components/chat/ChatRoom.vue'),
      props: route => ({
        roomId: route.params.id,
        username: route.query.username ?? 'study-user',
        isVideoEnabled: false,
      }),
    },
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
