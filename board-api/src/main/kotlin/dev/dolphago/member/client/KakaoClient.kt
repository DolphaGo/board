package dev.dolphago.member.client

import dev.dolphago.member.client.configuration.KakaoFeignConfiguration
import dev.dolphago.member.dto.KakaoAuthorization
import dev.dolphago.member.dto.KakaoInfo
import dev.dolphago.member.dto.KakaoToken
import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestParam
import java.net.URI


@FeignClient(name = "kakaoClient", configuration = [KakaoFeignConfiguration::class])
interface KakaoClient {
    @PostMapping
    fun getInfo(baseUrl: URI, @RequestHeader("Authorization") accessToken: String): KakaoInfo

    @GetMapping
    fun authorize(
        baseUrl: URI,
        @RequestParam("response_type") responseType: String,
        @RequestParam("client_id") restApiKey: String,
        @RequestParam("redirect_uri") redirectUrl: String
    ): KakaoAuthorization

    @PostMapping
    fun getToken(
        baseUrl: URI,
        @RequestParam("grant_type") grantType: String,
        @RequestParam("client_id") restApiKey: String,
        @RequestParam("redirect_uri") redirectUrl: String,
        @RequestParam("code") code: String
    ): KakaoToken
}
