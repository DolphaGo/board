package dev.dolphago.member.controller

import dev.dolphago.member.dto.KakaoAccount
import dev.dolphago.member.service.KakaoService
import jakarta.servlet.http.HttpServletResponse
import mu.KotlinLogging
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RequestMapping("/kakao")
@RestController
class KakaoController(
    private val kakaoService: KakaoService,
) {

    val log = KotlinLogging.logger { }

    @GetMapping("/login")
    fun login(response: HttpServletResponse) = response.sendRedirect(kakaoService.createRedirectURI().toString())

    @GetMapping("/oauth/callback")
    fun redirectLogin(
        @RequestParam("code") code: String,
    ): KakaoAccount? {
        log.info { "code => $code" }
        return kakaoService.getKakaoAccount(code)
    }
}
