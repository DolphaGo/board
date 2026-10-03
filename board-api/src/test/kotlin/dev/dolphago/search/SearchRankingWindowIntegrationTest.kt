package dev.dolphago.search

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.springframework.core.io.ClassPathResource
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory
import org.springframework.data.redis.core.RedisCallback
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.script.DefaultRedisScript
import java.time.Duration
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SearchRankingWindowIntegrationTest {
    private val factory = LettuceConnectionFactory("127.0.0.1", 16379)
    private lateinit var redis: StringRedisTemplate
    private lateinit var service: SearchRankingService
    private val eventsKey = SearchRankingService.LIVE_RANKING_KEY + ":events"
    private val keys =
        listOf(
            SearchRankingService.RANKING_KEY,
            SearchRankingService.LIVE_RANKING_KEY,
            SearchRankingService.SOURCE_RANKING_KEY,
            eventsKey,
        )

    @BeforeEach
    fun prepareDedicatedRedis() {
        // 로컬과 CI 모두 전용 테스트 Redis 16379를 사용한다. 운영 Redis를 연결하지 않는다.
        factory.afterPropertiesSet()
        factory.start()
        redis = StringRedisTemplate(factory)
        redis.delete(keys)
        service = SearchRankingService(redis)
    }

    @AfterEach
    fun closeDedicatedConnection() {
        if (::redis.isInitialized) redis.delete(keys)
        factory.destroy()
    }

    @Test
    fun `검색이 이어져도 30분 밖의 기록은 live 점수에서 빠진다`() {
        addEvent("old", Duration.ofMinutes(31))
        redis.opsForZSet().add(SearchRankingService.RANKING_KEY, "old", 3.0)

        service.record("new")

        assertEquals(listOf("new"), service.getTopKeywords(10).map { it.keyword })
        assertEquals(1L, service.getTopKeywords(10).single().score)
        assertEquals(3.0, redis.opsForZSet().score(SearchRankingService.RANKING_KEY, "old"))
        assertEquals(1.0, redis.opsForZSet().score(SearchRankingService.SOURCE_RANKING_KEY, "direct"))
    }

    @Test
    fun `조회만 해도 오래된 횟수를 빼고 구분 문자 포함 검색어의 최근 횟수를 유지한다`() {
        addEvent("same:keyword", Duration.ofMinutes(31))
        addEvent("same:keyword", Duration.ofMinutes(29))

        val result = service.getTopKeywords(10)

        assertEquals(listOf("same:keyword"), result.map { it.keyword })
        assertEquals(1L, result.single().score)
        assertEquals(1L, redis.opsForZSet().zCard(eventsKey))
    }

    @Test
    fun `반복 검색 이벤트를 덮어쓰지 않고 만료 후 다시 1부터 live 점수를 쌓는다`() {
        service.record("repeat")
        service.record("repeat")
        assertEquals(2L, redis.opsForZSet().zCard(eventsKey))
        assertEquals(2L, service.getTopKeywords(10).single().score)

        val expiredAt = now() - Duration.ofMinutes(31).toMillis()
        redis.opsForZSet().range(eventsKey, 0, -1).orEmpty().forEach { event ->
            redis.opsForZSet().add(eventsKey, event, expiredAt.toDouble())
        }
        assertTrue(service.getTopKeywords(10).isEmpty())

        service.record("repeat")
        assertEquals(1L, service.getTopKeywords(10).single().score)
        assertEquals(3.0, redis.opsForZSet().score(SearchRankingService.RANKING_KEY, "repeat"))
    }

    @Test
    fun `조회 개수와 큰 Long 범위를 Redis 정수 인덱스로 전달한다`() {
        service.record("one")
        service.record("two")
        service.record("two")

        assertEquals(listOf("two"), service.getTopKeywords(1).map { it.keyword })
        assertEquals(listOf("two", "one"), service.getTopKeywords(Long.MAX_VALUE).map { it.keyword })
    }

    @Test
    fun `정확히 30분인 이벤트는 제외하고 경계 직후의 이벤트는 포함한다`() {
        val fixedNow = 2_000_000_000_000L
        val cutoff = fixedNow - Duration.ofMinutes(30).toMillis()
        redis.opsForZSet().add(SearchRankingService.LIVE_RANKING_KEY, "boundary", 1.0)
        redis.opsForZSet().add(SearchRankingService.LIVE_RANKING_KEY, "inside", 1.0)
        redis.opsForZSet().add(eventsKey, "first:boundary", cutoff.toDouble())
        redis.opsForZSet().add(eventsKey, "second:inside", (cutoff + 1).toDouble())

        // TIME 응답만 고정하고 ZSET 연산과 운영 Lua 본문은 실제 Redis에서 그대로 실행한다.
        // 실제 시간 대기 없이 정확한 경계의 포함/제외를 재현하는 테스트용 외부 시계 대역이다.
        val fixedTime = """
            local originalRedis = redis
            local redis = { call = function(command, ...)
                if command == 'TIME' then return {'2000000000', '0'} end
                return originalRedis.call(command, ...)
            end }
        """.trimIndent()
        val body = ClassPathResource("redis/live-search-ranking.lua").inputStream.bufferedReader().use { it.readText() }
        val script = DefaultRedisScript<List<*>>(fixedTime + "\n" + body, List::class.java)

        val result = redis.execute(
            script,
            listOf(SearchRankingService.LIVE_RANKING_KEY, eventsKey),
            "1800000", "read", "", "", "9",
        )
        assertEquals(listOf("inside", "1"), result)
    }

    @Test
    fun `병렬 검색의 이벤트와 live 점수를 잃지 않는다`() {
        Executors.newFixedThreadPool(4).use { pool ->
            pool.invokeAll(List(20) { Callable { service.record("parallel") } }).forEach { it.get() }
        }

        assertEquals(20L, redis.opsForZSet().zCard(eventsKey))
        assertEquals(20L, service.getTopKeywords(10).single().score)
        assertEquals(20.0, redis.opsForZSet().score(SearchRankingService.RANKING_KEY, "parallel"))
    }

    private fun addEvent(keyword: String, age: Duration) {
        redis.opsForZSet().incrementScore(SearchRankingService.LIVE_RANKING_KEY, keyword, 1.0)
        redis.opsForZSet().add(eventsKey, "${UUID.randomUUID()}:$keyword", (now() - age.toMillis()).toDouble())
    }

    private fun now(): Long =
        requireNotNull(redis.execute(RedisCallback { it.serverCommands().time(TimeUnit.MILLISECONDS) }))
}
