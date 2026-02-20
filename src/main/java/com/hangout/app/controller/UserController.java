package com.hangout.app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.hangout.app.entity.UserEntity;
import com.hangout.app.repository.UserRepository;
import com.hangout.app.utils.JwtUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtil;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private String extractEmail(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.extractEmail(token);
    }

    // GET PROFILE
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader) {
        String email = extractEmail(authHeader);
        Optional<UserEntity> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        UserEntity user = optUser.get();
        return ResponseEntity.ok(Map.of(
            "id", user.getId(),
            "firstname", user.getFirstname(),
            "lastname", user.getLastname(),
            "email", user.getEmail(),
            "age", user.getAge() != null ? user.getAge() : "",
            "birthdate", user.getBirthdate() != null ? user.getBirthdate().toString() : "",
            "role", user.getRole()
        ));
    }

    // EDIT PROFILE
    @PutMapping("/profile")
    public ResponseEntity<?> editProfile(@RequestHeader("Authorization") String authHeader,
                                          @RequestBody Map<String, String> body) {
        String email = extractEmail(authHeader);
        Optional<UserEntity> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        UserEntity user = optUser.get();
        if (body.containsKey("firstname")) user.setFirstname(body.get("firstname"));
        if (body.containsKey("lastname")) user.setLastname(body.get("lastname"));
        if (body.containsKey("age")) user.setAge(Integer.parseInt(body.get("age")));
        user.setUpdatedAt(LocalDateTime.now());

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
    }

    // EDIT PASSWORD
    @PutMapping("/password")
    public ResponseEntity<?> editPassword(@RequestHeader("Authorization") String authHeader,
                                           @RequestBody Map<String, String> body) {
        String email = extractEmail(authHeader);
        Optional<UserEntity> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        UserEntity user = optUser.get();
        if (!passwordEncoder.matches(body.get("oldPassword"), user.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("message", "Old password is incorrect"));
        }

        user.setPasswordHash(passwordEncoder.encode(body.get("newPassword")));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    // UPLOAD PHOTO
    @PostMapping("/photo")
    public ResponseEntity<?> uploadPhoto(@RequestHeader("Authorization") String authHeader,
                                          @RequestParam("photo") MultipartFile file) {
        String email = extractEmail(authHeader);
        Optional<UserEntity> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        try {
            UserEntity user = optUser.get();
            user.setPhoto(file.getBytes());
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Photo uploaded successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to upload photo"));
        }
    }
}