package com.hangout.app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.hangout.app.entity.UserEntity;
import com.hangout.app.repository.UserRepository;
import com.hangout.app.utils.JwtUtils;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // REGISTER
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        if (userRepository.existsByEmail(body.get("email"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));
        }

        UserEntity user = new UserEntity();
        user.setFirstname(body.get("firstname"));
        user.setLastname(body.get("lastname"));
        user.setEmail(body.get("email"));
        user.setPasswordHash(passwordEncoder.encode(body.get("password")));
        user.setRole("user");

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    // LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        Optional<UserEntity> optUser = userRepository.findByEmail(body.get("email"));

        if (optUser.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
        }

        UserEntity user = optUser.get();
        if (!passwordEncoder.matches(body.get("password"), user.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
        }

        String token = jwtUtils.generateToken(user.getEmail());
        return ResponseEntity.ok(Map.of(
            "message", "Login successful",
            "token", token,
            "email", user.getEmail(),
            "firstname", user.getFirstname()
        ));
    }
}