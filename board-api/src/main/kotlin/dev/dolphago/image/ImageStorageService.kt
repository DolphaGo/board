package dev.dolphago.image

import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.FileSystemResource
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID

data class StoredImage(
    val fileName: String,
    val url: String,
)

@Service
class ImageStorageService(
    @Value("\${board.image.upload-root:build/uploads}") uploadRoot: String,
) {
    private val root: Path = Path.of(uploadRoot).toAbsolutePath().normalize()

    fun store(file: MultipartFile): StoredImage {
        require(!file.isEmpty) { "빈 파일은 업로드할 수 없습니다." }
        require(file.size <= DEFAULT_MAX_FILE_BYTES) { "이미지는 5MB까지만 업로드할 수 있습니다." }

        val contentType = file.contentType
        val extension = allowedExtensions[contentType]
        require(extension != null) { "PNG, JPEG, GIF, WebP 이미지만 업로드할 수 있습니다." }

        Files.createDirectories(root)

        // 원본 파일명은 사용자 입력이므로 그대로 저장하지 않는다.
        // UUID 파일명은 같은 이름 업로드 충돌과 경로 조작 위험을 동시에 줄이는 가장 단순한 샘플 방식이다.
        val fileName = "${UUID.randomUUID()}.$extension"
        val target = root.resolve(fileName).normalize()

        require(target.startsWith(root)) { "잘못된 파일 이름입니다." }

        file.inputStream.use { input ->
            Files.copy(input, target)
        }

        return StoredImage(
            fileName = fileName,
            url = "/api/images/$fileName",
        )
    }

    fun load(fileName: String): FileSystemResource {
        val target = root.resolve(fileName).normalize()

        require(target.startsWith(root)) { "잘못된 파일 이름입니다." }
        require(Files.exists(target)) { "이미지를 찾을 수 없습니다." }

        return FileSystemResource(target)
    }

    fun contentType(fileName: String): MediaType {
        val extension = fileName.substringAfterLast('.', "").lowercase()

        return mediaTypesByExtension[extension] ?: MediaType.APPLICATION_OCTET_STREAM
    }

    companion object {
        const val DEFAULT_MAX_FILE_BYTES: Int = 5 * 1024 * 1024

        // image/svg+xml도 이미지 MIME 타입이지만 브라우저에서 스크립트 실행 이슈를 만들 수 있다.
        // 샘플 게시판에서는 게시글 본문에 직접 노출하기 좋은 안전한 래스터 이미지 타입만 허용한다.
        private val allowedExtensions =
            mapOf(
                MediaType.IMAGE_PNG_VALUE to "png",
                MediaType.IMAGE_JPEG_VALUE to "jpg",
                MediaType.IMAGE_GIF_VALUE to "gif",
                "image/webp" to "webp",
            )

        private val mediaTypesByExtension =
            mapOf(
                "png" to MediaType.IMAGE_PNG,
                "jpg" to MediaType.IMAGE_JPEG,
                "jpeg" to MediaType.IMAGE_JPEG,
                "gif" to MediaType.IMAGE_GIF,
                "webp" to MediaType.parseMediaType("image/webp"),
            )
    }
}
