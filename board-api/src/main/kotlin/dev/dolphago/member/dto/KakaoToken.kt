package dev.dolphago.member.dto

import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming

@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy::class)
data class KakaoToken(val accessToken: String, val refreshToken: String) {
    val tokenType: String? = null
    val expiresIn: Long? = null
    val refreshTokenExpiresIn: Long? = null

    companion object {
        fun fail(): KakaoToken {
            return KakaoToken("", "")
        }
    }
}
