package dev.dolphago.member.dto

import tools.jackson.databind.PropertyNamingStrategies
import tools.jackson.databind.annotation.JsonNaming

@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy::class)
data class KakaoInfo(
    val kakaoAccount: KakaoAccount,
)

@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy::class)
data class KakaoAccount(
    val email: String,
)
