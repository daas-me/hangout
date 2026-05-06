package com.hangout.app.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hangout.app.user.entity.UserEntity;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByEmail(String email);
    boolean existsByEmail(String email);
}