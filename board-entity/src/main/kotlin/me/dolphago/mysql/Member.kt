package me.dolphago.mysql

import jakarta.persistence.*

@Entity
@Table(name = "member")
data class Member(
    @Column(name = "mid", nullable = false)
    val mid: String,

    @Column(name = "name", nullable = false)
    val name: String,

    @Column(name = "age", nullable = false)
    val age: Int,
) : EntityListener() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    var id: Long? = null

    @OneToMany(mappedBy = "member")
    val posts: List<Post> = listOf()
}
