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
        const val GRANT_TYPE = "authorization_code"
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
            log.error { "Something error when getting token.. $e" }
            return KakaoToken.fail()
        }
    }

    fun createRedirectURI(): URI = URI.create(
        "${kakaoConfig.authUrl}?response_type=code&client_id=${kakaoConfig.restApiKey}&redirect_uri=${kakaoConfig.redirectUrl}"
    )
}
