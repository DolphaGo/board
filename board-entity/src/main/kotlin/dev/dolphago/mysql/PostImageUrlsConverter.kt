package dev.dolphago.mysql

import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

@Converter
class PostImageUrlsConverter : AttributeConverter<List<String>, String> {
    override fun convertToDatabaseColumn(attribute: List<String>?): String =
        attribute
            .orEmpty()
            .map(String::trim)
            .filter(String::isNotBlank)
            .joinToString(IMAGE_URL_SEPARATOR)

    override fun convertToEntityAttribute(dbData: String?): List<String> =
        dbData
            ?.split(IMAGE_URL_SEPARATOR)
            ?.map(String::trim)
            ?.filter(String::isNotBlank)
            .orEmpty()

    companion object {
        // 샘플 프로젝트에서는 업로드 파일 테이블을 먼저 만들지 않고 URL 배열부터 저장한다.
        // 줄바꿈 구분은 JSON 매핑보다 단순하고, 화면에서 이미지 순서를 다시 복원하기에 충분하다.
        private const val IMAGE_URL_SEPARATOR = "\n"
    }
}
