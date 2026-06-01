package dev.dolphago.member.repository

import dev.dolphago.mysql.Member
import org.springframework.data.jpa.repository.JpaRepository

// Member 엔티티는 board-entity 모듈의 MySQL source of truth다.
// Repository도 같은 모듈에 두면 board-api는 "저장소를 사용"만 하고,
// 엔티티/영속성 세부 구조는 board-entity가 책임진다는 경계가 분명해진다.
interface MemberRepository : JpaRepository<Member, Long> {
    fun findByEmail(email: String): Member?
}
