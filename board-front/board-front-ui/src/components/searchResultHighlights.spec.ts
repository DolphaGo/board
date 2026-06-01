import { collectSearchResultHighlights } from './searchResultHighlights'

describe('# Search result highlights', function () {
  it('should flatten Elasticsearch highlight fields for rendering', function () {
    const snippets = collectSearchResultHighlights({
      title: ['<em>Kotlin</em> Spring 게시판 검색'],
      content: ['Elasticsearch <em>score</em> example', 'nori analyzer example'],
    })

    expect(snippets).toEqual([
      {
        field: 'title',
        text: '<em>Kotlin</em> Spring 게시판 검색',
      },
      {
        field: 'content',
        text: 'Elasticsearch <em>score</em> example',
      },
      {
        field: 'content',
        text: 'nori analyzer example',
      },
    ])
  })
})
