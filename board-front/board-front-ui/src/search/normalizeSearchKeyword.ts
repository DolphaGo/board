export const normalizeSearchKeyword = (keyword: string): string =>
  keyword.trim().replace(/\s+/g, ' ')
