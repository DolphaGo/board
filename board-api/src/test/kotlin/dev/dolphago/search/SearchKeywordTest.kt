package dev.dolphago.search

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class SearchKeywordTest {
    @Test
    fun `검색어는 앞뒤 공백과 중복 공백을 정리하고 소문자로 저장한다`() {
        val keyword = SearchKeyword.from("  Kotlin   SpringBoot  ")

        assertEquals("kotlin springboot", keyword.value)
    }

    @Test
    fun `빈 검색어는 만들 수 없다`() {
        assertFailsWith<IllegalArgumentException> {
            SearchKeyword.from("   ")
        }
    }
}
