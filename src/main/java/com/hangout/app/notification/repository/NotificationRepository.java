package com.hangout.app.notification.repository;

import com.hangout.app.notification.entity.NotificationEntity;
import com.hangout.app.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    /** All notifications for a user, newest first, capped at 50 */
    @Query("SELECT n FROM NotificationEntity n WHERE n.user = :user ORDER BY n.createdAt DESC")
    List<NotificationEntity> findTop50ByUserOrderByCreatedAtDesc(@Param("user") UserEntity user);

    /** Count unread */
    long countByUserAndIsRead(UserEntity user, Boolean isRead);

    /** Mark all as read for a user */
    @Modifying
    @Transactional
    @Query("UPDATE NotificationEntity n SET n.isRead = true WHERE n.user = :user AND n.isRead = false")
    void markAllReadForUser(@Param("user") UserEntity user);

    /** Delete all for a user */
    @Modifying
    @Transactional
    void deleteAllByUser(UserEntity user);

    /** Delete a single notification (ownership check done in service) */
    @Modifying
    @Transactional
    void deleteById(Long id);
}