package dev.dolphago.image

import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.FileSystemResource
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
        require(file.contentType?.startsWith("image/") == true) { "이미지 파일만 업로드할 수 있습니다." }

        Files.createDirectories(root)

        // 원본 파일명은 사용자 입력이므로 그대로 저장하지 않는다.
        // UUID 파일명은 같은 이름 업로드 충돌과 경로 조작 위험을 동시에 줄이는 가장 단순한 샘플 방식이다.
        val extension =
            file.originalFilename
                ?.substringAfterLast('.', "")
                ?.lowercase()
                ?.takeIf { it.isNotBlank() }
                ?: "bin"
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
}
