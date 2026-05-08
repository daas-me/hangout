package com.hangout.app.event.repository;

import com.hangout.app.event.entity.EventEntity;
import com.hangout.app.event.entity.FavoriteEntity;
import com.hangout.app.user.entity.UserEntity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<FavoriteEntity, Long> {

    @Query("SELECT f FROM FavoriteEntity f LEFT JOIN FETCH f.event e LEFT JOIN FETCH e.host WHERE f.user = :user ORDER BY f.createdAt DESC")
    List<FavoriteEntity> findByUser(@Param("user") UserEntity user);

    Optional<FavoriteEntity> findByUserAndEvent(UserEntity user, EventEntity event);

    Long countByUser(UserEntity user);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM FavoriteEntity f WHERE f.user = :user AND f.event = :event")
    boolean existsByUserAndEvent(@Param("user") UserEntity user, @Param("event") EventEntity event);
}