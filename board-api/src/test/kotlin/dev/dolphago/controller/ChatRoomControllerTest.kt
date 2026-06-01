package dev.dolphago.controller

import dev.dolphago.service.ChatRoomService
import io.mockk.mockk
import io.mockk.verify
import org.springframework.http.HttpStatus
import kotlin.test.Test
import kotlin.test.assertEquals

class ChatRoomControllerTest {
    private val chatRoomService = mockk<ChatRoomService>(relaxed = true)
    private val chatRoomController = ChatRoomController(chatRoomService)

    @Test
    fun `createChatRoom은 이름이 비어 있으면 400을 반환하고 서비스를 호출하지 않는다`() {
        val response =
            chatRoomController.createChatRoom(
                CreateChatRoomRequest(
                    name = "   ",
                    description = "이름이 없는 방",
                    createdBy = 1L,
                ),
            )

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        verify(exactly = 0) { chatRoomService.createChatRoom(any(), any(), any(), any()) }
    }

    @Test
    fun `createChatRoom은 최대 참여자 수가 범위를 벗어나면 400을 반환하고 서비스를 호출하지 않는다`() {
        listOf(1, 101).forEach { maxParticipants ->
            val response =
                chatRoomController.createChatRoom(
                    CreateChatRoomRequest(
                        name = "코프링 스터디",
                        description = "범위를 벗어난 정원",
                        createdBy = 1L,
                        maxParticipants = maxParticipants,
                    ),
                )

            assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        }
        verify(exactly = 0) { chatRoomService.createChatRoom(any(), any(), any(), any()) }
    }

    @Test
    fun `joinChatRoom은 채팅방 id가 비어 있으면 400을 반환하고 서비스를 호출하지 않는다`() {
        val response = chatRoomController.joinChatRoom("   ", JoinChatRoomRequest(memberId = 1L))

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        verify(exactly = 0) { chatRoomService.joinChatRoom(any(), any()) }
    }

    @Test
    fun `leaveChatRoom은 채팅방 id가 비어 있으면 400을 반환하고 서비스를 호출하지 않는다`() {
        val response = chatRoomController.leaveChatRoom("   ", LeaveChatRoomRequest(memberId = 1L))

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        verify(exactly = 0) { chatRoomService.leaveChatRoom(any(), any()) }
    }
}
