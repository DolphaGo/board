package dev.dolphago.member.client.configuration

import feign.Client
import feign.RequestInterceptor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration


@Configuration
internal class KakaoFeignConfiguration {
    @Bean
    fun feignClient(): Client {
        return Client.Default(null, null)
    }

    @Bean
    fun requestInterceptor(): RequestInterceptor {
        return RequestInterceptor { template -> template.header("Content-Type", "application/json") }
    }
}
