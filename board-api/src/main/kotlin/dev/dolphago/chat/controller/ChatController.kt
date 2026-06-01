package dev.dolphago.chat.controller

import dev.dolphago.chat.model.ChatMessage
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Controller

@Controller
class ChatController(
    private val messagingTemplate: SimpMessagingTemplate,
) {
    @MessageMapping("/chat.sendMessage")
    fun sendMessage(
        @Payload message: ChatMessage,
    ) {
        publishToRoom(message)
    }

    @MessageMapping("/chat.addUser")
    fun addUser(
        @Payload message: ChatMessage,
        headerAccessor: SimpMessageHeaderAccessor,
    ) {
        // Add username in web socket session
        val sessionAttributes = headerAccessor.sessionAttributes ?: mutableMapOf<String, Any>()
        sessionAttributes["username"] = message.sender
        headerAccessor.sessionAttributes = sessionAttributes
        publishToRoom(message)
    }

    private fun publishToRoom(message: ChatMessage) {
        // 방 단위 topic으로 발행해야 같은 public topic을 쓰는 다른 방 메시지가 섞이지 않는다.
        messagingTemplate.convertAndSend("/topic/chat/${message.roomId}", message)
    }
}
