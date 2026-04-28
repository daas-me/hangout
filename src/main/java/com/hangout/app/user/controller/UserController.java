package com.hangout.app.user.controller;

import com.hangout.app.user.service.UserService;
import com.hangout.app.shared.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired private UserService userService;
    @Autowired private JwtUtils    jwtUtils;

    private String extractEmail(String authHeader) {
        if (authHeader == null || authHeader.trim().isEmpty()) {
            throw new IllegalArgumentException("Authorization header is missing");
        }
        String token = authHeader.replace("Bearer ", "").trim();
        if (token.isEmpty()) {
            throw new IllegalArgumentException("Authorization header is empty");
        }
        return jwtUtils.extractEmail(token);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(userService.getProfile(extractEmail(authHeader)));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(userService.getStats(extractEmail(authHeader)));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> editProfile(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestBody Map<String, String> body) {
        userService.editProfile(extractEmail(authHeader), body);
        return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
    }

    @PutMapping("/password")
    public ResponseEntity<?> editPassword(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @RequestBody Map<String, String> body) {
        userService.editPassword(extractEmail(authHeader), body.get("oldPassword"), body.get("newPassword"));
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @GetMapping("/photo")
    public ResponseEntity<?> getPhoto(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(Map.of("photo", userService.getPhoto(extractEmail(authHeader))));
    }

    @PostMapping("/photo")
    public ResponseEntity<?> uploadPhoto(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestParam("photo") MultipartFile file) {
        try {
            userService.uploadPhoto(extractEmail(authHeader), file.getBytes());
            String photo = userService.getPhoto(extractEmail(authHeader));
            return ResponseEntity.ok(Map.of("message", "Photo uploaded successfully", "photo", photo));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to upload photo"));
        }
    }

    @DeleteMapping("/photo")
    public ResponseEntity<?> deletePhoto(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        userService.deletePhoto(extractEmail(authHeader));
        return ResponseEntity.ok(Map.of("message", "Photo removed"));
    }
}