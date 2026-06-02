import {createRouter, createWebHashHistory, RouteParams} from 'vue-router'
import Homepage from './components/Homepage.vue'
import AdminHiddenPostList from './components/AdminHiddenPostList.vue'
import NoticePostList from './components/NoticePostList.vue'
import PostDetail from './components/PostDetail.vue'
import PostEditor from "./components/PostEditor.vue";
import SearchResults from './components/SearchResults.vue'
import { STUDY_CHAT_USERNAME } from './chat/chatStudyConfig'

export type AppRouteNames = ''

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
  const username = firstRouteValue(route.query.username) || STUDY_CHAT_USERNAME

  // Vue Router의 params/query는 같은 key가 여러 번 들어오면 배열이 될 수 있다.
  // ChatRoom은 문자열 prop만 받으므로 라우터 경계에서 화면이 쓰기 쉬운 값으로 좁힌다.
  return {
    roomId,
    username,
    isVideoEnabled: false,
  }
}

export const buildPostEditorRouteProps = (route: {
  query: Record<string, unknown>
}) => {
  const role = firstRouteValue(route.query.role)

  // 아직 로그인/권한 세션이 없는 학습용 UI이므로 쿼리로 관리자 작성 모드를 켠다.
  // 백엔드는 memberId의 Authority를 다시 검사하므로 프론트 표시는 편의 기능이고 보안 경계가 아니다.
  return {
    authorRole: role === 'admin' ? 'admin' : 'user',
  }
}

export const buildPostDetailRouteProps = (route: {
  query: Record<string, unknown>
}) => {
  const role = firstRouteValue(route.query.role)

  // 상세 화면도 로그인 연동 전까지는 role=admin 쿼리로 관리자 전용 액션을 노출한다.
  // 실제 숨김 권한은 PATCH /api/posts/{id}/hide에서 actorMemberId로 다시 검증된다.
  return {
    authorRole: role === 'admin' ? 'admin' : 'user',
  }
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Homepage },
    { path: '/notices', component: NoticePostList },
    { path: '/search', component: SearchResults },
    { path: '/admin/hidden-posts', component: AdminHiddenPostList },
    { path: '/post/edit', component: PostEditor, props: buildPostEditorRouteProps },
    { path: '/post/:id', component: PostDetail, props: buildPostDetailRouteProps },
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
