package dev.dolphago.chat.controller

import dev.dolphago.chat.model.ChatMessage
import dev.dolphago.chat.model.MessageType
import io.mockk.clearMocks
import io.mockk.mockk
import io.mockk.verify
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals

class ChatControllerTest {
    private val messagingTemplate = mockk<SimpMessagingTemplate>(relaxed = true)
    private val chatController = ChatController(messagingTemplate)

    @BeforeTest
    fun setUp() {
        clearMocks(messagingTemplate)
    }

    @Test
    fun `sendMessage는 메시지를 채팅방 topic으로 발행한다`() {
        val message =
            ChatMessage(
                type = MessageType.TALK,
                roomId = "room-1",
                sender = "study-user",
                content = "안녕하세요",
            )

        chatController.sendMessage(message)

        verify { messagingTemplate.convertAndSend("/topic/chat/room-1", message) }
    }

    @Test
    fun `addUser는 세션에 사용자명을 저장하고 채팅방 topic으로 발행한다`() {
        val message =
            ChatMessage(
                type = MessageType.ENTER,
                roomId = "room-1",
                sender = "study-user",
                content = "입장",
            )
        val headerAccessor = SimpMessageHeaderAccessor.create()

        chatController.addUser(message, headerAccessor)

        assertEquals("study-user", headerAccessor.sessionAttributes?.get("username"))
        verify { messagingTemplate.convertAndSend("/topic/chat/room-1", message) }
    }

    @Test
    fun `sendMessage는 roomId가 비어 있으면 발행하지 않는다`() {
        val message =
            ChatMessage(
                type = MessageType.TALK,
                roomId = "   ",
                sender = "study-user",
                content = "방 없는 메시지",
            )

        chatController.sendMessage(message)

        verify(exactly = 0) { messagingTemplate.convertAndSend(any<String>(), any<ChatMessage>()) }
    }
}
