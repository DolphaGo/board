package dev.dolphago.member.dto

import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming

@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy::class)
data class KakaoAuthorization(
    val code: String,
    val error: String? = null,
    val errorDescription: String? = null,
    val state: String? = null
)
