package dev.dolphago.domain.chat.dto

import dev.dolphago.domain.chat.ChatRoom
import dev.dolphago.mysql.Member
import java.time.LocalDateTime

data class ChatRoomResponse(
    val id: String,
    val name: String,
    val description: String?,
    val createdBy: MemberSimpleInfo,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime,
    val maxParticipants: Int,
    val isPrivate: Boolean,
    val participants: List<MemberSimpleInfo>,
    val currentParticipants: Int
) {
    companion object {
        fun from(chatRoom: ChatRoom, creator: Member, participants: List<Member>): ChatRoomResponse {
            return ChatRoomResponse(
                id = chatRoom.id!!,
                name = chatRoom.name,
                description = chatRoom.description,
                createdBy = MemberSimpleInfo.from(creator),
                createdAt = chatRoom.createdAt,
                updatedAt = chatRoom.updatedAt,
                maxParticipants = chatRoom.maxParticipants,
                isPrivate = chatRoom.isPrivate,
                participants = participants.map { MemberSimpleInfo.from(it) },
                currentParticipants = participants.size
            )
        }
    }
}

data class MemberSimpleInfo(
    val id: Long,
    val nickname: String,
    val email: String
) {
    companion object {
        fun from(member: Member): MemberSimpleInfo {
            return MemberSimpleInfo(
                id = member.id!!,
                nickname = member.nickname,
                email = member.email
            )
        }
    }
} 