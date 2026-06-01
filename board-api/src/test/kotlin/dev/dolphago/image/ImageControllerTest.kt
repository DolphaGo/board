package dev.dolphago.image

import org.springframework.mock.web.MockMultipartFile
import java.nio.file.Path
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class ImageControllerTest {
    @Test
    fun `이미지 업로드 응답은 게시글 에디터가 저장할 URL만 노출한다`() {
        val service = ImageStorageService(Path.of("build", "test-image-controller").toString())
        val controller = ImageController(service)
        val file =
            MockMultipartFile(
                "file",
                "sample.png",
                "image/png",
                "image-bytes".toByteArray(),
            )

        val response = controller.upload(file)

        assertEquals(200, response.statusCode.value())
        assertNotNull(response.body)
        assert(response.body!!.url.startsWith("/api/images/"))
    }
}
