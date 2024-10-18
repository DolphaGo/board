package dev.dolphago.member.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "kakao")
data class KakaoConfig(
    val authUrl: String,
    val userApiUrl: String,
    val restApiKey: String,
    val redirectUrl: String,
    val tokenUrl: String,
)
