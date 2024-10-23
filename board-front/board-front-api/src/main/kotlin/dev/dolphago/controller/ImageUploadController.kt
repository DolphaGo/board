package dev.dolphago.controller

import dev.dolphago.util.DolphaGoUtils
import mu.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.PutObjectRequest

@CrossOrigin
@RestController
@RequestMapping("/api/v1/images")
class ImageUploadController(
    val s3Client: S3Client,

    @Value("\${cloud.aws.s3.bucket}")
    private val bucketName: String
) {



    private val log = KotlinLogging.logger { }

    @PostMapping("/upload")
    fun uploadImage(@RequestParam("file") file: MultipartFile): String {
        val randomId = DolphaGoUtils.generateNanoId()
        val fileName = "$randomId-${file.originalFilename}"
        val putObjectRequest = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(fileName)
            .build()

        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(file.bytes))
        return "https://$bucketName.s3.ap-northeast-2.amazonaws.com/$fileName"
    }

}
