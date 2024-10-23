package dev.dolphago.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client


@Configuration
class S3Config {

    @Value("\${cloud.aws.credentials.access-key}")
    private var accessKey: String? = null

    @Value("\${cloud.aws.credentials.secret-key}")
    private var secretKey: String? = null

    @Value("\${cloud.aws.region.static}")
    private var region: String? = null

    @Bean
    fun amazonS3Client(): S3Client {
        val credentials = AwsBasicCredentials.create(accessKey, secretKey)
        return S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))
            .build()
    }
}
