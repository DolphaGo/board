import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {resolve} from "path";
import analyzer from "rollup-plugin-analyzer";
import {
  createLocalChatRoomFixture,
  createLocalChatRoomsFixture,
  parseLocalChatRoomsRequestPath,
} from "./src/api/localChatFixture";
import {
  createLocalHiddenPostsFixture,
  createLocalNoticePostsFixture,
  createLocalPostCommentsFixture,
  createLocalPostFixture,
  createLocalPostListPageFixture,
  parseLocalPostRequestPath,
} from "./src/api/localPostFixture";
import {createPostSearchFixture, createRelatedPostSearchFixture} from "./src/api/postSearchFixture";
import {createSearchRankingFixture} from "./src/api/searchRankingFixture";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'src': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
  plugins: [
    vue(),
    {
      name: 'board-local-api-fixture',
      configureServer(server) {
        server.middlewares.use('/api/search/posts', (req, res, next) => {
          if (req.method !== 'GET') {
            next()
            return
          }

          const requestUrl = new URL(req.url ?? '', 'http://localhost')
          const relatedPostMatch = /^\/(\d+)\/related$/.exec(requestUrl.pathname)

          if (relatedPostMatch) {
            const postId = Number(relatedPostMatch[1])
            const size = Number(requestUrl.searchParams.get('size') ?? '3')

            // 관련 글 추천은 검색 결과와 같은 DTO를 사용한다.
            // Vite 단독 상세 화면에서도 scoreExplanation/scoringSignals를 확인하며 추천 점수 학습 UI를 볼 수 있게 한다.
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(createRelatedPostSearchFixture(postId, Number.isInteger(size) && size > 0 ? size : 3)))
            return
          }

          const keyword = requestUrl.searchParams.get('keyword') ?? ''

          // local Vite 단독 실행에서도 ES 검색 성공 화면을 학습/검증할 수 있게
          // 개발 서버에서만 동작하는 fixture 응답을 내려준다.
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(createPostSearchFixture(keyword)))
        })
        server.middlewares.use('/api/search/rankings', (req, res, next) => {
          if (req.method === 'POST') {
            // local fixture는 검색어 기록 저장소를 갖지 않는다.
            // 실제 정규화/누적은 Spring API의 ranking endpoint에서 학습한다.
            res.statusCode = 204
            res.end()
            return
          }

          if (req.method !== 'GET') {
            next()
            return
          }

          const requestUrl = new URL(req.url ?? '', 'http://localhost')
          const limit = Number(requestUrl.searchParams.get('limit') ?? '10')

          // 프론트만 실행해도 우측 실시간 검색어 영역이 API fallback HTML을 받지 않게 한다.
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(createSearchRankingFixture(limit)))
        })
        server.middlewares.use('/api/chat/rooms', (req, res, next) => {
          if (req.method === 'GET') {
            const localChatRequest = parseLocalChatRoomsRequestPath(req.url ?? '')

            // 채팅 REST fixture는 WebSocket/STOMP를 대체하지 않는다.
            // 대신 Vite만 띄운 학습 모드에서 목록, 상세, 정원 표시, 입장 버튼의 REST 전제조건을 확인하게 해준다.
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(
              localChatRequest.kind === 'list'
                ? createLocalChatRoomsFixture()
                : createLocalChatRoomFixture(localChatRequest.roomId),
            ))
            return
          }

          if (req.method === 'POST') {
            const localChatRequest = parseLocalChatRoomsRequestPath(req.url ?? '')

            if (localChatRequest.kind === 'join' || localChatRequest.kind === 'leave') {
              res.statusCode = 204
              res.end()
              return
            }

            // 방 생성 API는 생성된 방 DTO를 바로 반환한다.
            // 요청 body 파싱은 실제 Spring API 책임으로 두고, local fixture는 생성 후 입장 흐름만 재현한다.
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(createLocalChatRoomFixture('local-created-room')))
            return
          }

          next()
        })
        server.middlewares.use('/api/posts', (req, res, next) => {
          if (req.method === 'GET') {
            const localPostRequest = parseLocalPostRequestPath(req.url ?? '')

            if (localPostRequest.kind === 'list') {
              // 목록 화면은 page DTO를 기대한다.
              // Vite 단독 실행에서도 게시판 하단 페이지네이션과 목록 검증 로직이 같은 계약으로 동작하게 한다.
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(createLocalPostListPageFixture({
                page: localPostRequest.page,
                size: localPostRequest.size,
              })))
              return
            }

            if (localPostRequest.kind === 'notices') {
              // 공지 탭은 배열 DTO를 기대하므로 상세 객체를 내려주면 postService 경계 검증에서 실패한다.
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(createLocalNoticePostsFixture()))
              return
            }

            if (localPostRequest.kind === 'hidden') {
              // 관리자 숨김 목록도 배열 DTO다. local fixture는 권한 검증 대신 화면 흐름만 재현한다.
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(createLocalHiddenPostsFixture()))
              return
            }

            if (localPostRequest.kind === 'comments') {
              // 상세 화면은 게시글과 댓글을 Promise.all로 함께 읽는다.
              // 댓글 경로까지 배열 DTO로 맞춰야 Vite 단독 학습 모드에서 API 검증 오류 없이 작성 완료 흐름을 확인할 수 있다.
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(createLocalPostCommentsFixture()))
              return
            }

            // 상세 화면도 board-api 없이 확인할 수 있게 작성 fixture와 같은 형태를 돌려준다.
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(createLocalPostFixture(localPostRequest.postId)))
            return
          }

          if (req.method !== 'POST') {
            next()
            return
          }

          // local Vite 단독 실행에서는 board-api가 없으므로 작성 성공 흐름만 재현한다.
          // 실제 DB 저장과 ES 색인은 Spring API의 PostService가 담당한다.
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(createLocalPostFixture()))
        })
      },
    },
    analyzer(),
  ]
})
