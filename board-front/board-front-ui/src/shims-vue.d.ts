declare module '*.vue' {
  import {defineComponent} from 'vue'
  const component: ReturnType<typeof defineComponent>
  export default component
}

interface ImportMeta {
  env: {
    VITE_FRONT_API_URL: string
  }
}
