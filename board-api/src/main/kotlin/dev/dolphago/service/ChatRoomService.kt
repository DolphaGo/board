package dev.dolphago.service

import dev.dolphago.domain.chat.ChatRoom
import dev.dolphago.domain.chat.ChatRoomRepository
import dev.dolphago.member.repository.MemberRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class ChatRoomService(
    private val chatRoomRepository: ChatRoomRepository,
    private val memberRepository: MemberRepository
) {
    @Transactional(readOnly = true)
    fun getAllChatRooms(): List<ChatRoom> {
        return chatRoomRepository.findAll()
    }

    @Transactional(readOnly = true)
    fun getChatRoomById(roomId: String): ChatRoom {
        return chatRoomRepository.findById(roomId).orElseThrow {
            throw IllegalArgumentException("채팅방을 찾을 수 없습니다: $roomId")
        }
    }

    fun createChatRoom(
        name: String,
        description: String?,
        createdBy: Long,
        maxParticipants: Int = 100
    ): ChatRoom {
        memberRepository.findById(createdBy).orElseThrow {
            throw IllegalArgumentException("사용자를 찾을 수 없습니다: $createdBy")
        }

        val chatRoom = ChatRoom(
            name = name,
            description = description,
            creatorId = createdBy,
            // 정원은 ChatRoom 엔티티가 가진 비즈니스 규칙이다.
            // 생성 시점에 명시적으로 저장해야 joinChatRoom에서 같은 값을 기준으로 입장을 제한할 수 있다.
            maxParticipants = maxParticipants,
            participants = mutableSetOf(createdBy)
        )

        return chatRoomRepository.save(chatRoom)
    }

    fun joinChatRoom(roomId: String, memberId: Long): ChatRoom {
        // 채팅방 참가자는 Member의 id만 저장한다.
        // 그래도 참가 전에 회원을 조회하는 이유는 존재하지 않는 id가 MongoDB 채팅방
        // 문서에 쌓이면 나중에 참가자 목록을 보여줄 때 깨진 참조가 되기 때문이다.
        memberRepository.findById(memberId).orElseThrow {
            throw IllegalArgumentException("사용자를 찾을 수 없습니다: $memberId")
        }

        val chatRoom = getChatRoomById(roomId)
        if (chatRoom.participants.contains(memberId)) {
            return chatRoom
        }
        if (chatRoom.isFull()) {
            // ChatRoom.maxParticipants는 단순 표시값이 아니라 입장 가능 인원을 제한하는 규칙이다.
            // 이 검사를 서비스에 두는 이유는 REST API, WebSocket, 배치 등 어떤 진입점으로
            // 참가 요청이 들어와도 같은 비즈니스 규칙을 재사용하기 위해서다.
            throw IllegalStateException("채팅방 정원이 가득 찼습니다: $roomId")
        }

        chatRoom.participants.add(memberId)
        return chatRoomRepository.save(chatRoom)
    }

    fun leaveChatRoom(roomId: String, memberId: Long): ChatRoom {
        memberRepository.findById(memberId).orElseThrow {
            throw IllegalArgumentException("사용자를 찾을 수 없습니다: $memberId")
        }

        val chatRoom = getChatRoomById(roomId)
        if (!chatRoom.participants.contains(memberId)) {
            return chatRoom
        }

        chatRoom.participants.remove(memberId)
        return chatRoomRepository.save(chatRoom)
    }

    @Transactional(readOnly = true)
    fun getMemberChatRooms(memberId: Long): List<ChatRoom> {
        return chatRoomRepository.findByParticipantsContaining(memberId)
    }
}
