package dev.dolphago.service

import dev.dolphago.domain.chat.ChatRoom
import dev.dolphago.domain.chat.ChatRoomRepository
import dev.dolphago.member.repository.MemberRepository
import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Member
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.util.Optional
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ChatRoomServiceTest {
    private val chatRoomRepository = mockk<ChatRoomRepository>()
    private val memberRepository = mockk<MemberRepository>()
    private val chatRoomService = ChatRoomService(chatRoomRepository, memberRepository)

    @Test
    fun `채팅방 생성 시 최대 참여자 수를 지정할 수 있다`() {
        val creator =
            Member(
                id = 1L,
                email = "creator@example.com",
                nickname = "creator",
                role = Authority.ROLE_USER,
            )

        every { memberRepository.findById(1L) } returns Optional.of(creator)
        every { chatRoomRepository.save(any()) } answers { firstArg() }

        val room =
            chatRoomService.createChatRoom(
                name = "코프링 스터디",
                description = "Spring Boot와 Kotlin을 같이 공부하는 방",
                createdBy = 1L,
                maxParticipants = 30,
            )

        assertEquals(30, room.maxParticipants)
    }

    @Test
    fun `정원이 가득 찬 채팅방에는 새 참가자가 입장할 수 없다`() {
        val room =
            ChatRoom(
                id = "room-1",
                name = "코프링 스터디",
                creatorId = 1L,
                maxParticipants = 1,
                participants = mutableSetOf(1L),
            )
        val newMember =
            Member(
                id = 2L,
                email = "study-user@example.com",
                nickname = "study-user",
                role = Authority.ROLE_USER,
            )

        every { memberRepository.findById(2L) } returns Optional.of(newMember)
        every { chatRoomRepository.findById("room-1") } returns Optional.of(room)

        assertFailsWith<IllegalStateException> {
            chatRoomService.joinChatRoom("room-1", 2L)
        }

        verify(exactly = 0) { chatRoomRepository.save(any()) }
    }
}
