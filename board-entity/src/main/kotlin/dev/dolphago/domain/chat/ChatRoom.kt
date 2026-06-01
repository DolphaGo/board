package dev.dolphago.domain.chat

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import java.time.LocalDateTime

@Document(collection = "chat_rooms")
data class ChatRoom(
    @Id
    val id: String? = null,
    val name: String,
    val description: String? = null,
    val creatorId: Long,
    val createdAt: LocalDateTime = LocalDateTime.now(),
    val updatedAt: LocalDateTime = LocalDateTime.now(),
    val maxParticipants: Int = 100,
    val isPrivate: Boolean = false,
    val participants: MutableSet<Long> = mutableSetOf(),
) {
    fun addParticipant(memberId: Long): Boolean = participants.add(memberId)

    fun removeParticipant(memberId: Long): Boolean = participants.remove(memberId)

    fun isFull(): Boolean = participants.size >= maxParticipants

    fun hasParticipant(memberId: Long): Boolean = participants.contains(memberId)
}
