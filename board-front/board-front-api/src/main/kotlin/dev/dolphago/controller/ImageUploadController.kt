package dev.dolphago.controller

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.*

@CrossOrigin
@RestController
@RequestMapping("/api/v1/images")
class ImageUploadController {

    private val uploadDir: Path = Paths.get("uploads")

    init {
        Files.createDirectories(uploadDir)
    }

    @PostMapping("/upload")
    fun uploadImage(@RequestParam("file") file: MultipartFile): ResponseEntity<Map<String, String>> {
        return try {
            val fileName = UUID.randomUUID().toString() + "-" + file.originalFilename
            val filePath = uploadDir.resolve(fileName)
            Files.copy(file.inputStream, filePath)

            val fileUrl = "/uploads/$fileName"
            ResponseEntity(mapOf("url" to fileUrl), HttpStatus.OK)
        } catch (e: Exception) {
            ResponseEntity(mapOf("error" to "Could not upload file"), HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}
