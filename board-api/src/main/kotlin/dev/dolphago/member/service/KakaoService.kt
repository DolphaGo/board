package dev.dolphago.member.service

import dev.dolphago.member.client.KakaoClient
import dev.dolphago.member.config.KakaoConfig
import dev.dolphago.member.dto.KakaoAccount
import dev.dolphago.member.dto.KakaoToken
import dev.dolphago.member.repository.MemberRepository
import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Member
import jakarta.transaction.Transactional
import mu.KotlinLogging
import org.springframework.stereotype.Service
import java.net.URI
import java.util.*

@Service
class KakaoService(
    val client: KakaoClient,
    val kakaoConfig: KakaoConfig,
    val memberRepository: MemberRepository,
    val nicknameService: NicknameService
) {
    companion object {
        const val GRANT_TYPE = "authorization_code"
    }

    private val log = KotlinLogging.logger {}

    fun getKakaoAccount(code: String): String {
        val token = getToken(code)
        log.info { "token = $token" }
        val kakaoAccount = client.getInfo(
            URI(kakaoConfig.userApiUrl),
            token.tokenType + " " + token.accessToken
        ).kakaoAccount

        val email = kakaoAccount.email

        val member = memberRepository.findByEmail(email)
        if (member == null) {
            val newMember = Member(
                email = email,
                nickname = nicknameService.getRandomNickname(),
                role = Authority.ROLE_USER
            )

            memberRepository.save(newMember)

            return newMember.nickname
        }

        return member.nickname
    }

    private fun getToken(code: String): KakaoToken {
        try {
            return client.getToken(
                URI(kakaoConfig.tokenUrl),
                GRANT_TYPE,
                kakaoConfig.restApiKey,
                kakaoConfig.redirectUrl,
                code
            )
        } catch (e: Exception) {
            log.error { "Something error when getting kakao token.. $e" }
            return KakaoToken.fail()
        }
    }

    fun createRedirectURI(): URI = URI.create(
        "${kakaoConfig.authUrl}?response_type=code&client_id=${kakaoConfig.restApiKey}&redirect_uri=${kakaoConfig.redirectUrl}"
    )
}
