package com.hangout.app.event.repository;

import com.hangout.app.event.model.RSVPEntity;
import com.hangout.app.user.entity.UserEntity;
import com.hangout.app.event.model.EventEntity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RSVPRepository extends JpaRepository<RSVPEntity, Long> {
    
    // Find all RSVPs for a specific event with JOIN FETCH to prevent N+1
    @Query("SELECT r FROM RSVPEntity r LEFT JOIN FETCH r.user LEFT JOIN FETCH r.event WHERE r.event = :event")
    List<RSVPEntity> findByEvent(@Param("event") EventEntity event);

    // Find all RSVPs by a specific user with JOIN FETCH
    @Query("SELECT r FROM RSVPEntity r LEFT JOIN FETCH r.event e LEFT JOIN FETCH e.host LEFT JOIN FETCH r.user WHERE r.user = :user")
    List<RSVPEntity> findByUser(@Param("user") UserEntity user);

    // Check if user has RSVP'd to an event
    Optional<RSVPEntity> findByEventAndUser(EventEntity event, UserEntity user);

    // Count attendees for an event
    Long countByEventAndStatus(EventEntity event, String status);

    // Get all confirmed attendees for an event with JOIN FETCH
    @Query("SELECT r FROM RSVPEntity r LEFT JOIN FETCH r.user WHERE r.event = :event AND r.status = :status")
    List<RSVPEntity> findByEventAndStatus(@Param("event") EventEntity event, @Param("status") String status);

    @Query("SELECT COUNT(r) FROM RSVPEntity r WHERE r.event = :event AND r.status = :status AND (r.attendeeStatus IS NULL OR r.attendeeStatus != 'rejected')")
    Long countConfirmedExcludingRejected(@Param("event") EventEntity event, @Param("status") String status);

}
