package com.hangout.app.user.controller;

import com.hangout.app.user.entity.UserEntity;
import com.hangout.app.user.repository.UserRepository;
import com.hangout.app.event.repository.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Public Users Controller
 * Handles requests for public user profile information
 * Routes: /api/users/{id}/*
 */
@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"})
public class UsersController {

    @Autowired private UserRepository userRepository;
    @Autowired private EventRepository eventRepository;

    /**
     * GET /api/users/{id}/profile
     * Fetch public profile information for a user by ID
     * Returns: name, email, bio, photo, birthdate, gender, phone, location
     */
    @GetMapping("/{id}/profile")
    public ResponseEntity<?> getPublicProfile(@PathVariable Long id) {
        UserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("name", user.getFirstname() + " " + (user.getLastname() != null ? user.getLastname() : ""));
        profile.put("email", user.getEmail());
        profile.put("bio", user.getBio());
        profile.put("birthDate", user.getBirthdate());
        profile.put("gender", user.getGender());
        profile.put("phone", user.getPhone());
        
        // Build address
        profile.put("city", user.getCity());
        profile.put("state", user.getState());
        profile.put("country", user.getCountry());
        profile.put("zipcode", user.getZipcode());
        
        // Add photo as base64 if available
        if (user.getPhoto() != null && user.getPhoto().length > 0) {
            String photoBase64 = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(user.getPhoto());
            profile.put("photoUrl", photoBase64);
        }

        return ResponseEntity.ok(profile);
    }

    /**
     * GET /api/users/{id}/hosting-count
     * Fetch the number of published hangouts hosted by a user
     * Returns: count of published events hosted by this user
     */
    @GetMapping("/{id}/hosting-count")
    public ResponseEntity<?> getHostingCount(@PathVariable Long id) {
        UserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        long hostedCount = eventRepository.countPublishedByHost(user);

        return ResponseEntity.ok(hostedCount);
    }
}
