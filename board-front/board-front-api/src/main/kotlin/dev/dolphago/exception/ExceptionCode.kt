package dev.dolphago.exception

enum class ExceptionCode(
    val message: String
) {
    WRONG_FORMAT_FILE_NAME("Wrong format file name!"),
    NOT_EXSITS_FILE_EXTENSION("Not exist file extension!"),
    NOT_SUPPORT_FILE_EXTENSION("Not support file extension!"),
}
