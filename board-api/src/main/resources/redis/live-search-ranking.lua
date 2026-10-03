-- TIME을 사용해 API 프로세스의 시계 차이가 시간창 계산에 섞이지 않게 한다.
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local window = tonumber(ARGV[1])
local expired = redis.call('ZRANGE', KEYS[2], '-inf', now - window, 'BYSCORE')

-- 이벤트 정리와 횟수 차감을 함께 수행해 동시 기록과 조회가 섞이지 않게 한다.
for _, event in ipairs(expired) do
    local separator = string.find(event, ':', 1, true)
    local keyword = string.sub(event, separator + 1)
    local score = redis.call('ZINCRBY', KEYS[1], -1, keyword)
    if tonumber(score) <= 0 then
        redis.call('ZREM', KEYS[1], keyword)
    end
    redis.call('ZREM', KEYS[2], event)
end

if ARGV[2] == 'record' then
    redis.call('ZADD', KEYS[2], now, ARGV[4] .. ':' .. ARGV[3])
    redis.call('ZINCRBY', KEYS[1], 1, ARGV[3])
    -- TTL은 유휴 키 청소용이며 정확한 시간창은 위의 이벤트 정리가 담당한다.
    redis.call('PEXPIRE', KEYS[1], window)
    redis.call('PEXPIRE', KEYS[2], window)
    return {}
end

return redis.call('ZRANGE', KEYS[1], 0, ARGV[5], 'REV', 'WITHSCORES')
