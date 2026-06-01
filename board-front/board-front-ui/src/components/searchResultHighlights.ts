export interface SearchResultHighlightSnippet {
  field: string
  text: string
}

export const collectSearchResultHighlights = (
  highlights: Record<string, string[]>
): SearchResultHighlightSnippet[] =>
  Object.entries(highlights).flatMap(([field, values]) =>
    values.map(text => ({
      field,
      text,
    }))
  )
