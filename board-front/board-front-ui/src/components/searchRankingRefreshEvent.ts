const SEARCH_RANKING_REFRESH_EVENT = 'board:search-ranking-refresh'

type SearchRankingRefreshListener = () => void

const defaultEventTarget = (): EventTarget => window

export const notifySearchRankingChanged = (eventTarget: EventTarget = defaultEventTarget()): void => {
  eventTarget.dispatchEvent(new Event(SEARCH_RANKING_REFRESH_EVENT))
}

export const onSearchRankingChanged = (
  listener: SearchRankingRefreshListener,
  eventTarget: EventTarget = defaultEventTarget(),
): (() => void) => {
  eventTarget.addEventListener(SEARCH_RANKING_REFRESH_EVENT, listener)

  return () => {
    eventTarget.removeEventListener(SEARCH_RANKING_REFRESH_EVENT, listener)
  }
}
