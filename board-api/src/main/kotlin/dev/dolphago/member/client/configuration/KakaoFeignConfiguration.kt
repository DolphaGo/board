package dev.dolphago.member.client.configuration

import feign.Client
import feign.RequestInterceptor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
internal class KakaoFeignConfiguration {
    @Bean
    fun feignClient(): Client = Client.Default(null, null)

    @Bean
    fun requestInterceptor(): RequestInterceptor = RequestInterceptor { template -> template.header("Content-Type", "application/json") }
}
