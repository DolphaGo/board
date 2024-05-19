package dev.dolphago.member.service

import dev.dolphago.member.client.KakaoClient
import dev.dolphago.member.config.KakaoConfig
import dev.dolphago.member.dto.KakaoAccount
import dev.dolphago.member.dto.KakaoToken
import mu.KotlinLogging
import org.springframework.stereotype.Service
import java.net.URI

@Service
class KakaoService(
    val client: KakaoClient,
    val kakaoConfig: KakaoConfig
) {
    companion object {
        val GRANT_TYPE = "authorization_code"
    }
    private val log = KotlinLogging.logger {}

    fun getKakaoAccount(code: String): KakaoAccount? {
        val token = getToken(code)
        log.info { "token = $token" }
        try {
            return client.getInfo(
                URI(kakaoConfig.userApiUrl),
                token.tokenType + " " + token.accessToken
            ).kakaoAccount
        } catch (e: Exception) {
            log.error { "something error.. $e" }
            return null
        }
    }

    private fun getToken(code: String): KakaoToken {
        try {
            val token = client.getToken(
                URI(kakaoConfig.tokenUrl),
                GRANT_TYPE,
                kakaoConfig.restApiKey,
                kakaoConfig.redirectUrl,
                code
            )

            return token
        } catch (e: Exception) {
            log.error {"Something error when getting token.. $e"}
            return KakaoToken.fail()
        }
    }

    fun login() : String{
        // 1. 인가코드 받기
        // https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=35ce5a67d57b9e0c9f82b04882655b56&redirect_uri=http://localhost:8080/kakao/oauth/callback
        val authorization = client.authorize(
            URI(kakaoConfig.authUrl),
            "code",
            kakaoConfig.restApiKey,
            kakaoConfig.redirectUrl
        )

        val authorizationCode = authorization.code
        log.info { "authorizationCode = $authorizationCode" }

        return authorizationCode
    }
}
