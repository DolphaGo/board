const BLOCKED_TAG_NAMES = new Set(['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta'])
const URL_ATTRIBUTE_NAMES = new Set(['href', 'src'])

const isUnsafeUrl = (value: string) => {
  const normalizedValue = value.trim().toLowerCase()

  return normalizedValue.startsWith('javascript:') || normalizedValue.startsWith('data:text/html')
}

export const sanitizeRenderedMarkdown = (html: string): string => {
  const root = document.createElement('div')
  root.innerHTML = html

  root.querySelectorAll(Array.from(BLOCKED_TAG_NAMES).join(',')).forEach(element => {
    element.remove()
  })

  root.querySelectorAll('*').forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      const attributeName = attribute.name.toLowerCase()

      // v-html은 Vue template escaping을 우회한다.
      // 그래서 Markdown 결과를 넣기 전, inline event handler와 javascript URL처럼 브라우저가 실행할 수 있는 경계를 제거한다.
      if (attributeName.startsWith('on')) {
        element.removeAttribute(attribute.name)
        return
      }

      if (URL_ATTRIBUTE_NAMES.has(attributeName) && isUnsafeUrl(attribute.value)) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return root.innerHTML
}
