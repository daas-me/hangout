package com.hangout.app.event.repository;

import com.hangout.app.event.model.EventEntity;
import com.hangout.app.user.entity.UserEntity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<EventEntity, Long> {

    // All events hosted by a user with JOIN FETCH to prevent N+1 queries
    @Query("SELECT DISTINCT e FROM EventEntity e LEFT JOIN FETCH e.host h WHERE h = :host ORDER BY e.date ASC, e.startTime ASC")
    List<EventEntity> findByHostOrderByDateAscStartTimeAsc(@Param("host") UserEntity host);

    // All events on a specific date, ordered by start time
    List<EventEntity> findByDateOrderByStartTimeAsc(LocalDate date);

    // Count events hosted by a user
    long countByHost(UserEntity host);
    
    // Find all published (non-draft) events sorted by date
    @Query("SELECT e FROM EventEntity e WHERE e.isDraft = false OR e.isDraft IS NULL ORDER BY e.date ASC, e.startTime ASC")
    List<EventEntity> findAllPublishedEvents();
    
    // Find published events by date range (more efficient than loading all and filtering)
    @Query("SELECT e FROM EventEntity e WHERE (e.isDraft = false OR e.isDraft IS NULL) AND e.date >= :startDate AND e.date <= :endDate ORDER BY e.date ASC, e.startTime ASC")
    List<EventEntity> findPublishedEventsByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Find published events today
    @Query("SELECT e FROM EventEntity e WHERE (e.isDraft = false OR e.isDraft IS NULL) AND e.date = :date ORDER BY e.startTime ASC")
    List<EventEntity> findPublishedEventsByDate(@Param("date") LocalDate date);
}