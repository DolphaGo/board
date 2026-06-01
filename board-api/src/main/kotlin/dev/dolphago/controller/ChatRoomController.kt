package dev.dolphago.controller

import dev.dolphago.domain.chat.ChatRoom
import dev.dolphago.service.ChatRoomService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/chat/rooms")
class ChatRoomController(
    private val chatRoomService: ChatRoomService,
) {
    @GetMapping
    fun getAllChatRooms(): ResponseEntity<List<ChatRoom>> = ResponseEntity.ok(chatRoomService.getAllChatRooms())

    @GetMapping("/{id}")
    fun getChatRoomById(
        @PathVariable id: String,
    ): ResponseEntity<ChatRoom> = ResponseEntity.ok(chatRoomService.getChatRoomById(id))

    @PostMapping
    fun createChatRoom(
        @RequestBody request: CreateChatRoomRequest,
    ): ResponseEntity<ChatRoom> {
        // 채팅방 이름은 목록과 입장 화면에서 방을 식별하는 최소 정보다.
        // 공백뿐인 이름은 저장해도 사용자가 구분할 수 없으므로 HTTP 입력 단계에서 400으로 거부한다.
        if (request.name.isBlank()) {
            return ResponseEntity.badRequest().build()
        }
        // 현재 UI는 2명부터 100명까지의 공개 채팅방을 만든다.
        // 1명 이하이면 채팅방 의미가 약하고, 100명을 넘기면 학습용 MVP의 목록/참여자 표시가 불필요하게 커진다.
        if (request.maxParticipants !in 2..100) {
            return ResponseEntity.badRequest().build()
        }

        val chatRoom =
            chatRoomService.createChatRoom(
                name = request.name,
                description = request.description,
                createdBy = request.createdBy,
                maxParticipants = request.maxParticipants,
            )
        return ResponseEntity.ok(chatRoom)
    }

    @PostMapping("/{id}/join")
    fun joinChatRoom(
        @PathVariable id: String,
        @RequestBody request: JoinChatRoomRequest,
    ): ResponseEntity<ChatRoom> {
        // URL path의 방 id가 비어 있으면 어떤 방에 입장하는 요청인지 알 수 없다.
        // 이런 HTTP 입력 오류는 서비스까지 넘기지 않고 컨트롤러에서 400으로 끝낸다.
        if (id.isBlank()) {
            return ResponseEntity.badRequest().build()
        }

        return ResponseEntity.ok(chatRoomService.joinChatRoom(id, request.memberId))
    }

    @PostMapping("/{id}/leave")
    fun leaveChatRoom(
        @PathVariable id: String,
        @RequestBody request: LeaveChatRoomRequest,
    ): ResponseEntity<ChatRoom> {
        // 입장과 같은 이유로 방 id가 없으면 나가기 요청도 API 계약상 잘못된 요청이다.
        if (id.isBlank()) {
            return ResponseEntity.badRequest().build()
        }

        return ResponseEntity.ok(chatRoomService.leaveChatRoom(id, request.memberId))
    }

    @GetMapping("/members/{memberId}")
    fun getMemberChatRooms(
        @PathVariable memberId: Long,
    ): ResponseEntity<List<ChatRoom>> = ResponseEntity.ok(chatRoomService.getMemberChatRooms(memberId))
}

data class CreateChatRoomRequest(
    val name: String,
    val description: String?,
    val createdBy: Long, // Member ID
    val maxParticipants: Int = 100,
)

data class JoinChatRoomRequest(
    val memberId: Long,
)

data class LeaveChatRoomRequest(
    val memberId: Long,
)
