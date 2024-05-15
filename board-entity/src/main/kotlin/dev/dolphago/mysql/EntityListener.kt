package dev.dolphago.mysql

import jakarta.persistence.Column
import jakarta.persistence.EntityListeners
import jakarta.persistence.MappedSuperclass
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.LocalDateTime

@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
abstract class EntityListener {
    @CreatedDate
    @Column(name = "create_date", nullable = false, updatable = false)
    var createDate: LocalDateTime = LocalDateTime.MIN
        private set

    @LastModifiedDate
    @Column(name = "update_date", nullable = false)
    var updateDate: LocalDateTime = LocalDateTime.MIN
        private set
}
