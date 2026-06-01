package dev.dolphago.controller

import dev.dolphago.domain.chat.ChatRoom
import dev.dolphago.service.ChatRoomService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/chat/rooms")
class ChatRoomController(
    private val chatRoomService: ChatRoomService
) {
    @GetMapping
    fun getAllChatRooms(): ResponseEntity<List<ChatRoom>> =
        ResponseEntity.ok(chatRoomService.getAllChatRooms())

    @GetMapping("/{id}")
    fun getChatRoomById(@PathVariable id: String): ResponseEntity<ChatRoom> =
        ResponseEntity.ok(chatRoomService.getChatRoomById(id))

    @PostMapping
    fun createChatRoom(
        @RequestBody request: CreateChatRoomRequest
    ): ResponseEntity<ChatRoom> {
        val chatRoom = chatRoomService.createChatRoom(
            name = request.name,
            description = request.description,
            createdBy = request.createdBy
        )
        return ResponseEntity.ok(chatRoom)
    }

    @PostMapping("/{id}/join")
    fun joinChatRoom(
        @PathVariable id: String,
        @RequestBody request: JoinChatRoomRequest
    ): ResponseEntity<ChatRoom> =
        ResponseEntity.ok(chatRoomService.joinChatRoom(id, request.memberId))

    @PostMapping("/{id}/leave")
    fun leaveChatRoom(
        @PathVariable id: String,
        @RequestBody request: LeaveChatRoomRequest
    ): ResponseEntity<ChatRoom> =
        ResponseEntity.ok(chatRoomService.leaveChatRoom(id, request.memberId))

    @GetMapping("/members/{memberId}")
    fun getMemberChatRooms(@PathVariable memberId: Long): ResponseEntity<List<ChatRoom>> =
        ResponseEntity.ok(chatRoomService.getMemberChatRooms(memberId))
}

data class CreateChatRoomRequest(
    val name: String,
    val description: String?,
    val createdBy: Long // Member ID
)

data class JoinChatRoomRequest(
    val memberId: Long
)

data class LeaveChatRoomRequest(
    val memberId: Long
) 