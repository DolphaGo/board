package me.dolphago

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class BoardFrontApiApplication

fun main(args: Array<String>) {
    runApplication<BoardFrontApiApplication>(*args)
}
