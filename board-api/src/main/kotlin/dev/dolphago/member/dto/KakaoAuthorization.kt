package dev.dolphago.member.dto

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import tools.jackson.databind.PropertyNamingStrategies
import tools.jackson.databind.annotation.JsonNaming

@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy::class)
@JsonIgnoreProperties(ignoreUnknown = true)
data class KakaoAuthorization(
    val code: String,
    val error: String? = null,
    val errorDescription: String? = null,
    val state: String? = null,
)
