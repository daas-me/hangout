package com.hangout.app.repository;

import com.hangout.app.entity.EventEntity;
import com.hangout.app.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<EventEntity, Long> {

    // All events hosted by a user, ordered by date then start time
    List<EventEntity> findByHostOrderByDateAscStartTimeAsc(UserEntity host);

    // All events on a specific date, ordered by start time
    List<EventEntity> findByDateOrderByStartTimeAsc(LocalDate date);

    // Count events hosted by a user
    long countByHost(UserEntity host);
}