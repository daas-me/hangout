package com.hangout.app.event.controller;

import com.hangout.app.event.service.EventService;
import com.hangout.app.event.service.RSVPService;
import com.hangout.app.shared.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
public class EventController {

    @Autowired private EventService eventService;
    @Autowired private RSVPService   rsvpService;
    @Autowired private JwtUtils     jwtUtils;

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

    // ── Consistent absolute upload directory ──────────────────────────────────
    private Path getUploadDir() {
        Path dir = Paths.get(System.getProperty("user.home"), "hangout", "uploads")
                        .toAbsolutePath();
        try { Files.createDirectories(dir); } catch (Exception ignored) {}
        System.out.println("[Upload] Using upload dir: " + dir);
        return dir;
    }

    // ── Event CRUD ────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<?> createEvent(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestBody Map<String, Object> body) {
        return ResponseEntity.status(201).body(eventService.createEvent(extractEmail(authHeader), body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @PathVariable Long id,
                                          @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(eventService.updateEvent(extractEmail(authHeader), id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @PathVariable Long id) {
        eventService.deleteEvent(extractEmail(authHeader), id);
        return ResponseEntity.ok(Map.of("message", "Event deleted"));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publishEvent(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @PathVariable Long id) {
        return ResponseEntity.ok(eventService.publishEvent(extractEmail(authHeader), id));
    }

    @PostMapping("/{id}/unpublish")
    public ResponseEntity<?> unpublishEvent(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @PathVariable Long id) {
        return ResponseEntity.ok(eventService.unpublishEvent(extractEmail(authHeader), id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEventDetails(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                              @PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEventDetails(extractEmail(authHeader), id));
    }

    @GetMapping("/hosting")
    public ResponseEntity<?> getHostingEvents(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(eventService.getHostingEvents(extractEmail(authHeader)));
    }

    @GetMapping("/attending")
    public ResponseEntity<?> getAttendingEvents(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(rsvpService.getAttendingEvents(extractEmail(authHeader)));
    }

    @GetMapping("/today")
    public ResponseEntity<?> getTodayEvents(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(eventService.getTodayEvents(extractEmail(authHeader)));
    }

    @GetMapping("/discover")
    public ResponseEntity<?> getDiscoverEvents(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                                @RequestParam(defaultValue = "") String search,
                                                @RequestParam(defaultValue = "all") String filter) {
        return ResponseEntity.ok(eventService.getDiscoverEvents(extractEmail(authHeader), search, filter));
    }

    @GetMapping("/location/search")
    public ResponseEntity<?> locationSearch(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @RequestParam String q) {
        return ResponseEntity.ok(eventService.locationSearch(extractEmail(authHeader), q));
    }

    // ── RSVP Endpoints ────────────────────────────────────────────────────────

    @PostMapping("/{id}/rsvp")
    public ResponseEntity<?> rsvpEvent(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                       @PathVariable Long id,
                                       @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(201).body(rsvpService.createOrUpdateRSVP(
            extractEmail(authHeader), id, body != null ? body : Map.of()
        ));
    }

    @DeleteMapping("/{id}/rsvp")
    public ResponseEntity<?> cancelRSVP(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                        @PathVariable Long id) {
        return ResponseEntity.ok(rsvpService.cancelRSVP(extractEmail(authHeader), id));
    }

    @GetMapping("/{id}/rsvp/check")
    public ResponseEntity<?> checkRSVPStatus(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @PathVariable Long id) {
        return ResponseEntity.ok(rsvpService.checkRSVPStatus(extractEmail(authHeader), id));
    }

    @GetMapping("/{id}/attendees")
    public ResponseEntity<?> getEventAttendees(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                               @PathVariable Long id) {
        return ResponseEntity.ok(rsvpService.getEventAttendees(extractEmail(authHeader), id));
    }

    @PostMapping("/{id}/rsvp/{rsvpId}/approve")
    public ResponseEntity<?> approvePayment(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                            @PathVariable Long id,
                                            @PathVariable Long rsvpId) {
        return ResponseEntity.ok(rsvpService.approvePayment(extractEmail(authHeader), id, rsvpId));
    }

    @PostMapping("/{id}/rsvp/{rsvpId}/reject")
    public ResponseEntity<?> rejectPayment(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @PathVariable Long id,
                                           @PathVariable Long rsvpId) {
        return ResponseEntity.ok(rsvpService.rejectPayment(extractEmail(authHeader), id, rsvpId));
    }

    // ── Payment proof upload ──────────────────────────────────────────────────

    @PostMapping("/{id}/rsvp/payment-proof")
    public ResponseEntity<?> submitPaymentProof(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                                @PathVariable Long id,
                                                @RequestParam("paymentProof") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Payment proof file is required"));
        }
        try {
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path uploadDir = getUploadDir();
            Files.write(uploadDir.resolve(fileName), file.getBytes());
            System.out.println("[Upload] Saved file: " + uploadDir.resolve(fileName));
            return ResponseEntity.ok(rsvpService.submitPaymentProof(
                extractEmail(authHeader), id, "events/uploads/" + fileName
            ));
        } catch (Exception e) {
            System.err.println("[Upload] Failed to save file: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("message", "Failed to save payment proof"));
        }
    }

    // ── File serving ──────────────────────────────────────────────────────────

    @GetMapping("/uploads/{filename}")
    public ResponseEntity<?> serveFile(
            @PathVariable String filename,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Path filePath = getUploadDir().resolve(filename);
            System.out.println("[Serve] Looking for file: " + filePath);
            if (!Files.exists(filePath)) {
                System.out.println("[Serve] File not found: " + filePath);
                return ResponseEntity.notFound().build();
            }
            byte[] bytes = Files.readAllBytes(filePath);
            String contentType = resolveContentType(filename);
            return ResponseEntity.ok()
                .header("Content-Type", contentType)
                .header("Cache-Control", "public, max-age=3600")
                .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<?> serveLegacyFile(@PathVariable String filename) {
        String lower = filename.toLowerCase();
        if (!lower.endsWith(".jpg") && !lower.endsWith(".jpeg") &&
            !lower.endsWith(".png") && !lower.endsWith(".gif") &&
            !lower.endsWith(".webp") && !lower.endsWith(".heic")) {
            return ResponseEntity.notFound().build();
        }
        try {
            Path filePath = getUploadDir().resolve(filename);
            if (!Files.exists(filePath)) return ResponseEntity.notFound().build();
            byte[] bytes = Files.readAllBytes(filePath);
            return ResponseEntity.ok()
                .header("Content-Type", resolveContentType(filename))
                .header("Cache-Control", "public, max-age=3600")
                .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String resolveContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png"))  return "image/png";
        if (lower.endsWith(".gif"))  return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".heic")) return "image/heic";
        return "image/jpeg";
    }
}