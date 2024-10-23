package dev.dolphago.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "cloud.aws")
data class AwsProperties(
    val credentials: Credentials,
    val region: String,
    val s3: S3
) {
    data class Credentials(
        val accessKey: String,
        val secretKey: String
    )

    data class S3(
        val bucket: String,
    )
}
