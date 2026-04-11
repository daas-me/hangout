package com.hangout.app.event.controller;

import com.hangout.app.event.service.EventService;
import com.hangout.app.shared.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/events")
public class EventController {

    @Autowired private EventService eventService;
    @Autowired private JwtUtils     jwtUtils;

    private String extractEmail(String authHeader) {
        return jwtUtils.extractEmail(authHeader.replace("Bearer ", ""));
    }

    @PostMapping
    public ResponseEntity<?> createEvent(@RequestHeader("Authorization") String authHeader,
                                          @RequestBody Map<String, Object> body) {
        return ResponseEntity.status(201).body(eventService.createEvent(extractEmail(authHeader), body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(@RequestHeader("Authorization") String authHeader,
                                          @PathVariable Long id,
                                          @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(eventService.updateEvent(extractEmail(authHeader), id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(@RequestHeader("Authorization") String authHeader,
                                          @PathVariable Long id) {
        eventService.deleteEvent(extractEmail(authHeader), id);
        return ResponseEntity.ok(Map.of("message", "Event deleted"));
    }

    @GetMapping("/hosting")
    public ResponseEntity<?> getHostingEvents(@RequestHeader("Authorization") String authHeader) {
        return ResponseEntity.ok(eventService.getHostingEvents(extractEmail(authHeader)));
    }

    @GetMapping("/today")
    public ResponseEntity<?> getTodayEvents(@RequestHeader("Authorization") String authHeader) {
        return ResponseEntity.ok(eventService.getTodayEvents(extractEmail(authHeader)));
    }

    @GetMapping("/discover")
    public ResponseEntity<?> getDiscoverEvents(@RequestHeader("Authorization") String authHeader,
                                                @RequestParam(defaultValue = "") String search,
                                                @RequestParam(defaultValue = "all") String filter) {
        return ResponseEntity.ok(eventService.getDiscoverEvents(extractEmail(authHeader), search, filter));
    }

    @GetMapping("/location/search")
    public ResponseEntity<?> locationSearch(@RequestHeader("Authorization") String authHeader,
                                             @RequestParam String q) {
        return ResponseEntity.ok(eventService.locationSearch(extractEmail(authHeader), q));
    }
}