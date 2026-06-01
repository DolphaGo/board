package dev.dolphago.domain.chat

import org.springframework.data.mongodb.repository.MongoRepository
import org.springframework.stereotype.Repository

@Repository
interface ChatRoomRepository : MongoRepository<ChatRoom, String> {
    fun findByName(name: String): ChatRoom?
    fun findByParticipantsContaining(memberId: Long): List<ChatRoom>
    fun existsByName(name: String): Boolean
} 