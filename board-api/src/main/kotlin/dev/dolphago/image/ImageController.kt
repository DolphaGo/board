package dev.dolphago.image

import org.springframework.core.io.Resource
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/images")
class ImageController(
    private val imageStorageService: ImageStorageService,
) {
    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun upload(
        @RequestPart file: MultipartFile,
    ): ResponseEntity<ImageUploadResponse> {
        // 게시글 저장 전에 이미지를 먼저 저장하고 URL만 본문/게시글에 기록한다.
        // 실제 서비스에서는 이 저장소를 S3, GCS, CDN 업로드 서비스 등으로 교체하면 컨트롤러 계약은 유지된다.
        val storedImage = imageStorageService.store(file)

        return ResponseEntity.ok(ImageUploadResponse(url = storedImage.url))
    }

    @GetMapping("/{fileName:.+}")
    fun read(
        @PathVariable fileName: String,
    ): ResponseEntity<Resource> =
        ResponseEntity
            .ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(imageStorageService.load(fileName))
}

data class ImageUploadResponse(
    val url: String,
)
