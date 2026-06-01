import { notifySearchRankingChanged, onSearchRankingChanged } from './searchRankingRefreshEvent'

describe('# Search ranking refresh event', function () {
  it('should notify subscribed ranking refresh listeners', function () {
    const eventTarget = new EventTarget()
    const listener = jest.fn()
    const unsubscribe = onSearchRankingChanged(listener, eventTarget)

    notifySearchRankingChanged(eventTarget)

    expect(listener).toBeCalledTimes(1)

    unsubscribe()
    notifySearchRankingChanged(eventTarget)

    expect(listener).toBeCalledTimes(1)
  })
})
