package dev.dolphago.exception

class CustomException(
    exceptionCode: ExceptionCode
) : RuntimeException(exceptionCode.message)
