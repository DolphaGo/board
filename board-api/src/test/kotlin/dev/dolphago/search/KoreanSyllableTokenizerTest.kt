package dev.dolphago.search

import kotlin.test.Test
import kotlin.test.assertEquals

class KoreanSyllableTokenizerTest {
    @Test
    fun `한글 음절은 초성 중성 종성 토큰으로 분해한다`() {
        val tokens = KoreanSyllableTokenizer.tokenize("코틀린 게시판 검색")

        assertEquals("ㅋ ㅗ ㅌ ㅡ ㄹ ㄹ ㅣ ㄴ ㄱ ㅔ ㅅ ㅣ ㅍ ㅏ ㄴ ㄱ ㅓ ㅁ ㅅ ㅐ ㄱ", tokens)
    }

    @Test
    fun `영문과 숫자는 단어 단위 검색 의도를 유지한다`() {
        val tokens = KoreanSyllableTokenizer.tokenize("Spring Boot 4 코틀린!")

        assertEquals("spring boot 4 ㅋ ㅗ ㅌ ㅡ ㄹ ㄹ ㅣ ㄴ", tokens)
    }
}
