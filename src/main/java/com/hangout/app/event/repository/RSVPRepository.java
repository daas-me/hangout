package com.hangout.app.event.repository;

import com.hangout.app.event.model.RSVPEntity;
import com.hangout.app.event.model.EventEntity;
import com.hangout.app.user.model.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RSVPRepository extends JpaRepository<RSVPEntity, Long> {
    // Find all RSVPs for a specific event
    List<RSVPEntity> findByEvent(EventEntity event);

    // Find all RSVPs by a specific user
    List<RSVPEntity> findByUser(UserEntity user);

    // Check if user has RSVP'd to an event
    Optional<RSVPEntity> findByEventAndUser(EventEntity event, UserEntity user);

    // Count attendees for an event
    Long countByEventAndStatus(EventEntity event, String status);

    // Get all confirmed attendees for an event
    List<RSVPEntity> findByEventAndStatus(EventEntity event, String status);
}
