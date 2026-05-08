package com.hangout.app.message.repository;

import com.hangout.app.message.entity.MessageEntity;
import com.hangout.app.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<MessageEntity, Long> {

    @Query("""
        SELECT m FROM MessageEntity m
        LEFT JOIN FETCH m.sender
        LEFT JOIN FETCH m.recipient
        WHERE (m.sender = :a AND m.recipient = :b)
           OR (m.sender = :b AND m.recipient = :a)
        ORDER BY m.sentAt ASC
    """)
    List<MessageEntity> findConversation(@Param("a") UserEntity a, @Param("b") UserEntity b);

    // Simpler: just get ALL messages involving this user, sorted by time
    // We'll group them in the service layer instead
    @Query("""
        SELECT m FROM MessageEntity m
        LEFT JOIN FETCH m.sender
        LEFT JOIN FETCH m.recipient
        WHERE m.sender = :user OR m.recipient = :user
        ORDER BY m.sentAt DESC
    """)
    List<MessageEntity> findAllInvolvingUser(@Param("user") UserEntity user);

    Long countBySenderAndRecipientAndIsRead(
        UserEntity sender, UserEntity recipient, Boolean isRead);

    @Query("SELECT COUNT(m) FROM MessageEntity m WHERE m.recipient = :user AND m.isRead = false")
    Long countUnreadForUser(@Param("user") UserEntity user);

    @Modifying
    @Transactional
    @Query("""
        UPDATE MessageEntity m
        SET m.isRead = true
        WHERE m.sender = :sender
          AND m.recipient = :recipient
          AND m.isRead = false
    """)
    void markAsRead(@Param("sender") UserEntity sender,
                    @Param("recipient") UserEntity recipient);
}