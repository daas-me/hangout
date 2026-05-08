package com.hangout.app.event.service;

import com.hangout.app.event.model.EventEntity;
import com.hangout.app.event.model.FavoriteEntity;
import com.hangout.app.event.repository.EventRepository;
import com.hangout.app.event.repository.FavoriteRepository;
import com.hangout.app.event.repository.RSVPRepository;
import com.hangout.app.user.entity.UserEntity;
import com.hangout.app.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FavoriteService {

    @Autowired private FavoriteRepository favoriteRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository userRepository;

    private static final int MAX_FAVORITES = 10;

    // ── Helper Methods ─────────────────────────────────────────────────────────

    private UserEntity findUserOrThrow(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private EventEntity findEventOrThrow(Long eventId) {
        return eventRepository.findById(eventId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private Map<String, Object> toEventResponse(EventEntity event) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", event.getId());
        map.put("title", event.getTitle());
        map.put("imageUrl", event.getImageUrl());
        map.put("date", event.getDate());
        map.put("startTime", event.getStartTime());
        map.put("endTime", event.getEndTime());
        map.put("location", event.getLocation());
        map.put("format", event.getFormat());
        map.put("eventType", event.getEventType());
        map.put("price", event.getPrice());
        map.put("capacity", event.getCapacity());
        map.put("attendeeCount", event.getAttendeeCount());
        map.put("description", event.getDescription());
        map.put("isDraft", event.getIsDraft());
        map.put("eventStatus", event.getEventStatus());
        map.put("host", new HashMap<String, Object>() {{
            put("id", event.getHost().getId());
            put("name", event.getHost().getFirstname() + " " + event.getHost().getLastname());
            put("email", event.getHost().getEmail());
        }});
        return map;
    }

    // ── Add Favorite ────────────────────────────────────────────────────────────

    public Map<String, Object> addFavorite(String email, Long eventId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        // Check if already favorited
        if (favoriteRepository.existsByUserAndEvent(user, event)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event is already in favorites");
        }

        // Check if user has reached the 10-favorite limit
        Long favoriteCount = favoriteRepository.countByUser(user);
        if (favoriteCount >= MAX_FAVORITES) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, 
                "You have reached your favorite limit (" + MAX_FAVORITES + "). Please remove a favorite to add another.");
        }

        // Create and save favorite
        FavoriteEntity favorite = new FavoriteEntity(user, event);
        favoriteRepository.save(favorite);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Event added to favorites");
        response.put("event", toEventResponse(event));
        response.put("favoriteCount", favoriteCount + 1);
        return response;
    }

    // ── Remove Favorite ────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> removeFavorite(String email, Long eventId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        FavoriteEntity favorite = favoriteRepository.findByUserAndEvent(user, event)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event is not in your favorites"));

        favoriteRepository.deleteById(favorite.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Event removed from favorites");
        response.put("favoriteCount", favoriteRepository.countByUser(user));
        return response;
    }

    // ── Get User Favorites ─────────────────────────────────────────────────────
    @Autowired private RSVPRepository rsvpRepository;

    public List<Map<String, Object>> getUserFavorites(String email) {
        UserEntity user = findUserOrThrow(email);
        List<FavoriteEntity> favorites = favoriteRepository.findByUser(user);
        return favorites.stream()
            .map(f -> {
                EventEntity event = f.getEvent();
                // Recalculate like getEventDetails does
                long count = rsvpRepository.countConfirmedExcludingRejected(event, "confirmed");
                event.setAttendeeCount(Math.toIntExact(count));
                return toEventResponse(event);
            })
            .collect(Collectors.toList());
    }

    // ── Check if Event is Favorited ────────────────────────────────────────────

    public Map<String, Object> checkIsFavorite(String email, Long eventId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        boolean isFavorite = favoriteRepository.existsByUserAndEvent(user, event);
        Long favoriteCount = favoriteRepository.countByUser(user);

        Map<String, Object> response = new HashMap<>();
        response.put("isFavorite", isFavorite);
        response.put("favoriteCount", favoriteCount);
        response.put("maxFavorites", MAX_FAVORITES);
        return response;
    }

    // ── Get Favorite Count ─────────────────────────────────────────────────────

    public Map<String, Object> getFavoriteCount(String email) {
        UserEntity user = findUserOrThrow(email);
        Long favoriteCount = favoriteRepository.countByUser(user);

        Map<String, Object> response = new HashMap<>();
        response.put("count", favoriteCount);
        response.put("maxFavorites", MAX_FAVORITES);
        response.put("remaining", MAX_FAVORITES - favoriteCount);
        return response;
    }
}
