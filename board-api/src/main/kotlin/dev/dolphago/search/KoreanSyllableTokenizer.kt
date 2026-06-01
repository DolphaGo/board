package dev.dolphago.search

import java.util.Locale

object KoreanSyllableTokenizer {
    private val choseong =
        charArrayOf('ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ')
    private val jungseong =
        charArrayOf('ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ')
    private val jongseong =
        charArrayOf('\u0000', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ')

    fun tokenize(text: String): String {
        val tokens = mutableListOf<String>()
        val asciiWord = StringBuilder()

        fun flushAsciiWord() {
            if (asciiWord.isNotEmpty()) {
                tokens += asciiWord.toString().lowercase(Locale.ROOT)
                asciiWord.clear()
            }
        }

        text.forEach { char ->
            when {
                char.isHangulSyllable() -> {
                    flushAsciiWord()
                    tokens += char.decomposeHangulSyllable()
                }

                char.isLetterOrDigit() -> {
                    asciiWord.append(char)
                }

                else -> {
                    flushAsciiWord()
                }
            }
        }
        flushAsciiWord()

        return tokens.joinToString(" ")
    }

    fun tokenizeInitials(text: String): String {
        val tokens = mutableListOf<String>()
        val asciiWord = StringBuilder()

        fun flushAsciiWord() {
            if (asciiWord.isNotEmpty()) {
                tokens += asciiWord.toString().lowercase(Locale.ROOT)
                asciiWord.clear()
            }
        }

        text.forEach { char ->
            when {
                char.isHangulSyllable() -> {
                    flushAsciiWord()
                    tokens += char.extractInitial().toString()
                }

                char.isCompatibilityInitial() -> {
                    flushAsciiWord()
                    tokens += char.toString()
                }

                char.isLetterOrDigit() -> {
                    asciiWord.append(char)
                }

                else -> {
                    flushAsciiWord()
                }
            }
        }
        flushAsciiWord()

        return tokens.joinToString(" ")
    }

    private fun Char.isHangulSyllable(): Boolean = this in HANGUL_SYLLABLE_START..HANGUL_SYLLABLE_END

    private fun Char.isCompatibilityInitial(): Boolean = this in choseong

    private fun Char.extractInitial(): Char {
        val syllableIndex = code - HANGUL_SYLLABLE_START.code
        val choseongIndex = syllableIndex / (jungseong.size * jongseong.size)

        return choseong[choseongIndex]
    }

    private fun Char.decomposeHangulSyllable(): List<String> {
        // 한글 완성형 음절은 유니코드에서 "가"부터 초성 19개, 중성 21개, 종성 28개 순서로 배치된다.
        // 그래서 코드포인트를 빼고 나누면 외부 라이브러리 없이도 "코" -> "ㅋ ㅗ" 같은 검색 보조 토큰을 만들 수 있다.
        val syllableIndex = code - HANGUL_SYLLABLE_START.code
        val jungseongIndex = (syllableIndex % (jungseong.size * jongseong.size)) / jongseong.size
        val jongseongIndex = syllableIndex % jongseong.size

        return buildList {
            add(extractInitial().toString())
            add(jungseong[jungseongIndex].toString())
            if (jongseongIndex > 0) {
                add(jongseong[jongseongIndex].toString())
            }
        }
    }

    private const val HANGUL_SYLLABLE_START = '가'
    private const val HANGUL_SYLLABLE_END = '힣'
}
