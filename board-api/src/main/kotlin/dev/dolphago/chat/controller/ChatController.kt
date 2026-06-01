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
        // roomId가 없으면 어떤 채팅방에 입장한 사용자인지 알 수 없으므로 세션 사용자명도 저장하지 않는다.
        if (message.roomId.isBlank()) {
            return
        }

        // WebSocket 세션에 사용자명을 저장해 두면 연결 종료 이벤트 등에서 "누가 나갔는지"를 확인할 수 있다.
        val sessionAttributes = headerAccessor.sessionAttributes ?: mutableMapOf<String, Any>()
        sessionAttributes["username"] = message.sender
        headerAccessor.sessionAttributes = sessionAttributes
        publishToRoom(message)
    }

    private fun publishToRoom(message: ChatMessage) {
        if (message.roomId.isBlank()) {
            return
        }

        // 방 단위 topic으로 발행해야 같은 public topic을 쓰는 다른 방 메시지가 섞이지 않는다.
        messagingTemplate.convertAndSend("/topic/chat/${message.roomId}", message)
    }
}
