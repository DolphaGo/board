package dev.dolphago.member.repository

import dev.dolphago.mysql.Member
import org.springframework.data.jpa.repository.JpaRepository

interface MemberRepository : JpaRepository<Member, Long> {

    fun findByEmail(email: String) : Member?
}
