import { describe, expect, it, vi } from 'vitest'
import { notifySearchRankingChanged, onSearchRankingChanged } from './searchRankingRefreshEvent'

describe('# Search ranking refresh event', function () {
  it('should notify subscribed ranking refresh listeners', function () {
    const eventTarget = new EventTarget()
    const listener = vi.fn()
    const unsubscribe = onSearchRankingChanged(listener, eventTarget)

    notifySearchRankingChanged(eventTarget)

    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    notifySearchRankingChanged(eventTarget)

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
