package dev.dolphago.service

import dev.dolphago.config.AwsProperties
import dev.dolphago.util.DolphaGoUtils
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.PutObjectRequest

@Service
class ImageUploadService(
    val awsProperties: AwsProperties,
    val s3Client: S3Client
) {

    fun upload(file: MultipartFile): String {
        val randomId = DolphaGoUtils.generateNanoId()
        val fileName = "$DIRECTORY/$randomId-${file.originalFilename}"
        val putObjectRequest = PutObjectRequest.builder()
            .bucket(awsProperties.s3.bucket)
            .key(fileName)
            .build()

        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(file.bytes))
        return "https://${awsProperties.s3.bucket}.s3.ap-northeast-2.amazonaws.com/$fileName"
    }

    companion object {
        private const val DIRECTORY = "board"
    }
}
