package dev.dolphago.controller

import dev.dolphago.service.ImageUploadService
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@CrossOrigin
@RestController
@RequestMapping("/api/v1/images")
class ImageUploadController(
    val imageUploadService: ImageUploadService
) {

    @PostMapping("/upload")
    fun uploadImage(@RequestParam("file") file: MultipartFile): String {
        return imageUploadService.upload(file)
    }

}
