package dev.dolphago.chat.model

import java.time.LocalDateTime

data class ChatMessage(
    val type: MessageType,
    val roomId: String,
    val sender: String,
    val content: String? = null,
    val timestamp: LocalDateTime = LocalDateTime.now()
)

enum class MessageType {
    ENTER, TALK, LEAVE, SIGNAL
} 