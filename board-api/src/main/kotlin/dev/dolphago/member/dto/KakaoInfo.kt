package dev.dolphago.member.dto

import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming

@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy::class)
data class KakaoInfo(
    val kakaoAccount: KakaoAccount
)

@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy::class)
data class KakaoAccount(
    val email: String
)
