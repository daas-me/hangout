package com.hangout.app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.hangout.app.entity.UserEntity;
import com.hangout.app.repository.UserRepository;
import com.hangout.app.utils.JwtUtils;

import java.time.LocalDate;
import java.time.Period;
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
        // Check required fields
        if (body.get("firstname") == null || body.get("firstname").isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "First name is required"));
        if (body.get("lastname") == null || body.get("lastname").isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Last name is required"));
        if (body.get("email") == null || body.get("email").isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        if (body.get("birthdate") == null || body.get("birthdate").isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Birthdate is required"));

        // Check email exists
        if (userRepository.existsByEmail(body.get("email")))
            return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));

        // Validate password
        String password = body.get("password");
        if (password == null || !password.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$"))
        return ResponseEntity.badRequest().body(Map.of("message",
            "Password must be 8+ characters with uppercase, lowercase, number and special character"));

        // Validate birthdate not in future
       LocalDate birthdate = LocalDate.parse(body.get("birthdate"));
        if (birthdate.isAfter(LocalDate.now()))
            return ResponseEntity.badRequest().body(Map.of("message", "Birthdate cannot be in the future"));

        // Validate age must be 13+
        int age = Period.between(birthdate, LocalDate.now()).getYears();
        if (age < 13)
            return ResponseEntity.badRequest().body(Map.of("message", "You must be at least 13 years old to register"));

        UserEntity user = new UserEntity();
        user.setFirstname(body.get("firstname"));
        user.setLastname(body.get("lastname"));
        user.setEmail(body.get("email"));
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setBirthdate(birthdate);
        user.setAge(age);
        user.setRole("user");

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    // LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        Optional<UserEntity> optUser = userRepository.findByEmail(body.get("email"));
        if (optUser.isEmpty())
            return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));

        UserEntity user = optUser.get();
        if (!passwordEncoder.matches(body.get("password"), user.getPasswordHash()))
            return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));

        String token = jwtUtils.generateToken(user.getEmail());
        return ResponseEntity.ok(Map.of(
            "message", "Login successful",
            "token", token,
            "email", user.getEmail(),
            "firstname", user.getFirstname()
        ));
    }
}