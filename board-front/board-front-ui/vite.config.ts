import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {resolve} from "path";
import analyzer from "rollup-plugin-analyzer";
import {createPostSearchFixture} from "./src/api/postSearchFixture";

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
          const keyword = requestUrl.searchParams.get('keyword') ?? ''

          // local Vite 단독 실행에서도 ES 검색 성공 화면을 학습/검증할 수 있게
          // 개발 서버에서만 동작하는 fixture 응답을 내려준다.
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(createPostSearchFixture(keyword)))
        })
        server.middlewares.use('/api/posts', (req, res, next) => {
          if (req.method === 'GET') {
            const postId = (req.url ?? '').replace(/^\//, '') || '999'

            // 상세 화면도 board-api 없이 확인할 수 있게 작성 fixture와 같은 형태를 돌려준다.
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({
              id: Number(postId),
              title: `local fixture post #${postId}`,
              content: 'created by vite fixture',
              viewCount: 0,
              display: true,
            }))
            return
          }

          if (req.method !== 'POST') {
            next()
            return
          }

          // local Vite 단독 실행에서는 board-api가 없으므로 작성 성공 흐름만 재현한다.
          // 실제 DB 저장과 ES 색인은 Spring API의 PostService가 담당한다.
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({
            id: 999,
            title: 'local fixture post',
            content: 'created by vite fixture',
            viewCount: 0,
            display: true,
          }))
        })
      },
    },
    analyzer(),
  ]
})
