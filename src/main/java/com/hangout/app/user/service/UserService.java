package com.hangout.app.user.service;

import com.hangout.app.user.entity.UserEntity;
import com.hangout.app.user.repository.UserRepository;
import com.hangout.app.event.repository.EventRepository;
import com.hangout.app.event.repository.RSVPRepository;
import com.hangout.app.message.repository.MessageRepository;
import com.hangout.app.notification.repository.NotificationRepository;
import com.hangout.app.shared.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class UserService {

    @Autowired private UserRepository userRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private RSVPRepository rsvpRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private JwtUtils jwtUtils;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // ── Auth ──────────────────────────────────────────────────────────────────

    public void register(Map<String, String> body) {
        if (body.get("firstname") == null || body.get("firstname").isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "First name is required");
        if (body.get("lastname") == null || body.get("lastname").isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Last name is required");
        if (body.get("email") == null || body.get("email").isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        if (body.get("birthdate") == null || body.get("birthdate").isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Birthdate is required");

        if (userRepository.existsByEmail(body.get("email")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already exists");

        String password = body.get("password");
        if (password == null || !password.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Password must be 8+ characters with uppercase, lowercase, number and special character");

        LocalDate birthdate = LocalDate.parse(body.get("birthdate"));
        if (birthdate.isAfter(LocalDate.now()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Birthdate cannot be in the future");

        int age = Period.between(birthdate, LocalDate.now()).getYears();
        if (age < 13)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "You must be at least 13 years old to register");

        UserEntity user = new UserEntity();
        user.setFirstname(body.get("firstname"));
        user.setLastname(body.get("lastname"));
        user.setEmail(body.get("email"));
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setBirthdate(birthdate);
        user.setAge(age);
        user.setRole("user");

        userRepository.save(user);
    }

    public Map<String, Object> login(String email, String password) {
        UserEntity user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(password, user.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");

        return Map.of(
            "message",   "Login successful",
            "token",     jwtUtils.generateToken(user.getEmail()),
            "id",        user.getId(),
            "email",     user.getEmail(),
            "firstname", user.getFirstname(),
            "lastname",  user.getLastname() != null ? user.getLastname() : ""
        );
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    public Map<String, Object> getProfile(String email) {
        UserEntity user = findUserOrThrow(email);
        int completionPercent = calculateProfileCompletion(user);
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("firstname", user.getFirstname());
        profile.put("lastname", user.getLastname());
        profile.put("email", user.getEmail());
        profile.put("age", user.getAge() != null ? user.getAge() : "");
        profile.put("birthdate", user.getBirthdate() != null ? user.getBirthdate().toString() : "");
        profile.put("gender", user.getGender() != null ? user.getGender() : "");
        profile.put("role", user.getRole());
        profile.put("phone", user.getPhone() != null ? user.getPhone() : "");
        profile.put("city", user.getCity() != null ? user.getCity() : "");
        profile.put("bio", user.getBio() != null ? user.getBio() : "");
        profile.put("street", user.getStreet() != null ? user.getStreet() : "");
        profile.put("state", user.getState() != null ? user.getState() : "");
        profile.put("country", user.getCountry() != null ? user.getCountry() : "");
        profile.put("zipcode", user.getZipcode() != null ? user.getZipcode() : "");
        profile.put("completionPercent", completionPercent);
        profile.put("profileComplete", completionPercent == 100);
        return profile;
    }

    public Map<String, Object> getStats(String email) {
        UserEntity user = findUserOrThrow(email);

        long hostingCount = eventRepository.countByHost(user);
        int totalAttendees = eventRepository
            .findByHostOrderByDateAscStartTimeAsc(user)
            .stream()
            .mapToInt(e -> e.getAttendeeCount())
            .sum();

        return Map.of(
            "hostingCount",   hostingCount,
            "attendingCount", 0,
            "totalAttendees", totalAttendees
        );
    }

    public void editProfile(String email, Map<String, String> body) {
        UserEntity user = findUserOrThrow(email);
        if (body.containsKey("firstname")) user.setFirstname(body.get("firstname"));
        if (body.containsKey("lastname"))  user.setLastname(body.get("lastname"));
        if (body.containsKey("phone"))     user.setPhone(body.get("phone"));
        if (body.containsKey("city"))      user.setCity(body.get("city"));
        if (body.containsKey("bio"))       user.setBio(body.get("bio"));
        if (body.containsKey("street"))    user.setStreet(body.get("street"));
        if (body.containsKey("state"))     user.setState(body.get("state"));
        if (body.containsKey("country"))   user.setCountry(body.get("country"));
        if (body.containsKey("zipcode"))   user.setZipcode(body.get("zipcode"));
        if (body.containsKey("gender"))    user.setGender(body.get("gender"));
        if (body.containsKey("age"))       user.setAge(Integer.parseInt(body.get("age")));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public void editPassword(String email, String oldPassword, String newPassword) {
        UserEntity user = findUserOrThrow(email);
        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Old password is incorrect");
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    // ── Photo ─────────────────────────────────────────────────────────────────

    public String getPhoto(String email) {
        UserEntity user = findUserOrThrow(email);
        if (user.getPhoto() == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No photo found");
        return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(user.getPhoto());
    }

    public void uploadPhoto(String email, byte[] photoBytes) {
        UserEntity user = findUserOrThrow(email);
        user.setPhoto(photoBytes);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public void deletePhoto(String email) {
        UserEntity user = findUserOrThrow(email);
        user.setPhoto(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    // ── Account Deletion ──────────────────────────────────────────────────────

    @Transactional
    public void deleteAccount(String email) {
        UserEntity user = findUserOrThrow(email);

        // 1. Delete all notifications for the user
        notificationRepository.deleteAllByUser(user);

        // 2. Delete all messages sent or received by the user
        messageRepository.deleteAllInvolvingUser(user);

        // 3. For each event hosted by the user: delete all RSVPs on that event, delete the event
        eventRepository.findByHostOrderByDateAscStartTimeAsc(user).forEach(event -> {
            rsvpRepository.findByEvent(event).forEach(rsvp -> rsvpRepository.delete(rsvp));
            eventRepository.delete(event);
        });

        // 4. Delete all RSVPs where the user is the attendee (on other people's events)
        rsvpRepository.findByUser(user).forEach(rsvp -> rsvpRepository.delete(rsvp));

        // 5. Delete the user record itself
        userRepository.delete(user);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private UserEntity findUserOrThrow(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private int calculateProfileCompletion(UserEntity user) {
        int filled = 0;
        if (user.getFirstname() != null && !user.getFirstname().isBlank()) filled++;
        if (user.getLastname()  != null && !user.getLastname().isBlank())  filled++;
        if (user.getPhone()     != null && !user.getPhone().isBlank())     filled++;
        if (user.getCity()      != null && !user.getCity().isBlank())      filled++;
        if (user.getBio()       != null && !user.getBio().isBlank())       filled++;
        if (user.getStreet()    != null && !user.getStreet().isBlank())    filled++;
        if (user.getState()     != null && !user.getState().isBlank())     filled++;
        if (user.getCountry()   != null && !user.getCountry().isBlank())   filled++;
        if (user.getZipcode()   != null && !user.getZipcode().isBlank())   filled++;
        if (user.getGender()    != null && !user.getGender().isBlank())    filled++;
        if (user.getBirthdate() != null)                                    filled++;
        return (filled * 100) / 11;
    }
}