import {createRouter, createWebHashHistory, RouteParams} from 'vue-router'
import Homepage from './components/Homepage.vue'
import PostDetail from './components/PostDetail.vue'
import PostEditor from "./components/PostEditor.vue";
import SearchResults from './components/SearchResults.vue'

export type AppRouteNames = ''

const DEFAULT_STUDY_CHAT_USERNAME = 'study-user'

const firstRouteValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return firstRouteValue(value[0])
  }

  return typeof value === 'string' ? value : undefined
}

export const buildChatRoomRouteProps = (route: {
  params: Record<string, unknown>
  query: Record<string, unknown>
}) => {
  const roomId = firstRouteValue(route.params.id) ?? ''
  const username = firstRouteValue(route.query.username) || DEFAULT_STUDY_CHAT_USERNAME

  // Vue Router의 params/query는 같은 key가 여러 번 들어오면 배열이 될 수 있다.
  // ChatRoom은 문자열 prop만 받으므로 라우터 경계에서 화면이 쓰기 쉬운 값으로 좁힌다.
  return {
    roomId,
    username,
    isVideoEnabled: false,
  }
}

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
      props: buildChatRoomRouteProps,
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
