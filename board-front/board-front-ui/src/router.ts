import {createRouter, createWebHashHistory, RouteParams} from 'vue-router'
import Homepage from './components/Homepage.vue'
import PostDetail from './components/PostDetail.vue'
import PostEditor from "./components/PostEditor.vue";
import ChatRoomList from './components/chat/ChatRoomList.vue'
import ChatRoom from './components/chat/ChatRoom.vue'

export type AppRouteNames = ''

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Homepage },
    { path: '/post/edit', component: PostEditor },
    { path: '/post/:id', component: PostDetail },
    { path: '/chat/rooms', component: ChatRoomList },
    {
      path: '/chat/rooms/:id',
      component: ChatRoom,
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
