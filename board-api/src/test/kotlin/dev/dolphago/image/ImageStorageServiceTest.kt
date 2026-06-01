package dev.dolphago.image

import org.springframework.mock.web.MockMultipartFile
import java.nio.file.Path
import kotlin.io.path.exists
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ImageStorageServiceTest {
    @Test
    fun `이미지 파일을 업로드 디렉터리에 저장하고 조회 URL을 반환한다`() {
        val uploadRoot = kotlin.io.path.createTempDirectory("board-image-test")
        val service = ImageStorageService(uploadRoot.toString())
        val file =
            MockMultipartFile(
                "file",
                "sample.PNG",
                "image/png",
                "image-bytes".toByteArray(),
            )

        val result = service.store(file)

        assertTrue(result.fileName.endsWith(".png"))
        assertEquals("/api/images/${result.fileName}", result.url)
        assertTrue(uploadRoot.resolve(result.fileName).exists())
        assertTrue(service.load(result.fileName).exists())
    }

    @Test
    fun `이미지가 아닌 파일은 저장하지 않는다`() {
        val service = ImageStorageService(kotlin.io.path.createTempDirectory("board-image-test").toString())
        val file =
            MockMultipartFile(
                "file",
                "memo.txt",
                "text/plain",
                "not-image".toByteArray(),
            )

        assertFailsWith<IllegalArgumentException> {
            service.store(file)
        }
    }

    @Test
    fun `상위 디렉터리 접근 파일명은 읽지 않는다`() {
        val service = ImageStorageService(kotlin.io.path.createTempDirectory("board-image-test").toString())

        assertFailsWith<IllegalArgumentException> {
            service.load(Path.of("..", "secret.png").toString())
        }
    }
}
