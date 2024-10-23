package dev.dolphago.util

import com.aventrix.jnanoid.jnanoid.NanoIdUtils

object DolphaGoUtils {

    fun generateNanoId(): String {
        return NanoIdUtils.randomNanoId()
    }
}
