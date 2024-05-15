package dev.dolphago.mysql

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.Table

@Entity
@Table(name = "member")
data class Member(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    var id: Long? = null,

    @Column(name = "username", nullable = false)
    val username: String,

    @Column(name = "password", nullable = false)
    val password: String,

    @Column(name = "nickname", nullable = false)
    val nickname: String,

    @Column(name = "email", nullable = false)
    val email: String,

    @Column(name = "phone_number")
    val phoneNumber: String,

    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    val role: Authority
) : EntityListener() {

    @OneToMany(mappedBy = "member")
    val posts: List<Post> = listOf()
}
