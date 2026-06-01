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

    fun createChatRoom(name: String, description: String?, createdBy: Long): ChatRoom {
        memberRepository.findById(createdBy).orElseThrow {
            throw IllegalArgumentException("사용자를 찾을 수 없습니다: $createdBy")
        }

        val chatRoom = ChatRoom(
            name = name,
            description = description,
            creatorId = createdBy,
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
