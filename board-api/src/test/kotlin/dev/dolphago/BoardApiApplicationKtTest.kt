package dev.dolphago

import org.junit.jupiter.api.Test

class BoardApiApplicationKtTest {
    @Test
    fun test() {
        // given
        val list =
            listOf(1, 2, 3)
                .filter { it % 2 == 0 }

        println(list.takeIf { it.isNotEmpty() } ?: "empty")
    }
}
