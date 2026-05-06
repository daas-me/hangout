package com.hangout.app.event.controller;

import com.hangout.app.event.service.EventService;
import com.hangout.app.event.service.RSVPService;
import com.hangout.app.shared.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
public class EventController {

    @Autowired private EventService eventService;
    @Autowired private RSVPService   rsvpService;
    @Autowired private JwtUtils      jwtUtils;

    // Get authenticated email from SecurityContextHolder (set by JwtFilter)
    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof String) {
            return (String) principal;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid authentication context");
    }

    // ── Upload directory ──────────────────────────────────────────────────
    // Throws ResponseStatusException(500) instead of silently returning a
    // non-existent path, which previously caused ERR_CONNECTION_RESET.
    private Path getUploadDir() {
        Path dir = Paths.get(System.getProperty("user.home"), "hangout", "uploads")
                        .toAbsolutePath();
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            System.err.println("[Upload] FATAL: cannot create upload directory " + dir + ": " + e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Upload directory is not accessible. Please contact the administrator."
            );
        }
        System.out.println("[Upload] Using upload dir: " + dir);
        return dir;
    }

    // ── Event CRUD ────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<?> createEvent(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(201).body(eventService.createEvent(getAuthenticatedEmail(), body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(@PathVariable Long id,
                                          @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(eventService.updateEvent(getAuthenticatedEmail(), id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(getAuthenticatedEmail(), id);
        return ResponseEntity.ok(Map.of("message", "Event deleted"));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publishEvent(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.publishEvent(getAuthenticatedEmail(), id));
    }

    @PostMapping("/{id}/unpublish")
    public ResponseEntity<?> unpublishEvent(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.unpublishEvent(getAuthenticatedEmail(), id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEventDetails(@PathVariable Long id) {
        String email = null;
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
                String principal = auth.getName();
                if (principal != null && !"anonymousUser".equals(principal)) {
                    email = principal;
                }
            }
        } catch (Exception e) {
            // Silently fail - user is unauthenticated
        }
        return ResponseEntity.ok(eventService.getEventDetails(email, id));
    }

    @GetMapping("/hosting")
    public ResponseEntity<?> getHostingEvents() {
        return ResponseEntity.ok(eventService.getHostingEvents(getAuthenticatedEmail()));
    }

    @GetMapping("/attending")
    public ResponseEntity<?> getAttendingEvents() {
        return ResponseEntity.ok(rsvpService.getAttendingEvents(getAuthenticatedEmail()));
    }

    @GetMapping("/today")
    public ResponseEntity<?> getTodayEvents() {
        return ResponseEntity.ok(eventService.getTodayEvents(getAuthenticatedEmail()));
    }

    @GetMapping("/discover")
    public ResponseEntity<?> getDiscoverEvents(@RequestParam(defaultValue = "") String search,
                                                @RequestParam(defaultValue = "all") String filter,
                                                @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String email = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                if (jwtUtils.validateToken(token)) {
                    email = jwtUtils.extractEmail(token);
                }
            } catch (Exception e) {
                System.out.println("[getDiscoverEvents] Failed to extract email from token: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(eventService.getDiscoverEvents(email, search, filter));
    }

    @GetMapping("/location/search")
    public ResponseEntity<?> locationSearch(@RequestParam String q,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String email = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                if (jwtUtils.validateToken(token)) {
                    email = jwtUtils.extractEmail(token);
                }
            } catch (Exception e) {
                System.out.println("[locationSearch] Failed to extract email from token: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(eventService.locationSearch(email, q));
    }

    // ── RSVP Endpoints ────────────────────────────────────────────────────

    @PostMapping("/{id}/rsvp")
    public ResponseEntity<?> rsvpEvent(@PathVariable Long id,
                                       @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(201).body(rsvpService.createOrUpdateRSVP(
            getAuthenticatedEmail(), id, body != null ? body : Map.of()
        ));
    }

    @DeleteMapping("/{id}/rsvp")
    public ResponseEntity<?> cancelRSVP(@PathVariable Long id,
                                        @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(rsvpService.cancelRSVP(getAuthenticatedEmail(), id, body != null ? body : Map.of()));
    }

    @GetMapping("/{id}/rsvp/check")
    public ResponseEntity<?> checkRSVPStatus(@PathVariable Long id) {
        return ResponseEntity.ok(rsvpService.checkRSVPStatus(getAuthenticatedEmail(), id));
    }

    @GetMapping("/{id}/attendees")
    public ResponseEntity<?> getEventAttendees(@PathVariable Long id) {
        return ResponseEntity.ok(rsvpService.getEventAttendees(getAuthenticatedEmail(), id));
    }

    @PostMapping("/{id}/rsvp/{rsvpId}/approve")
    public ResponseEntity<?> approvePayment(@PathVariable Long id,
                                            @PathVariable Long rsvpId) {
        return ResponseEntity.ok(rsvpService.approvePayment(getAuthenticatedEmail(), id, rsvpId));
    }

    @PostMapping("/{id}/rsvp/{rsvpId}/reject")
    public ResponseEntity<?> rejectPayment(@PathVariable Long id,
                                           @PathVariable Long rsvpId) {
        return ResponseEntity.ok(rsvpService.rejectPayment(getAuthenticatedEmail(), id, rsvpId));
    }

    @PostMapping("/{id}/rsvp/{rsvpId}/confirm-attendee")
    public ResponseEntity<?> confirmAttendee(@PathVariable Long id,
                                             @PathVariable Long rsvpId) {
        return ResponseEntity.ok(rsvpService.confirmAttendee(getAuthenticatedEmail(), id, rsvpId));
    }

    @PostMapping("/{id}/rsvp/{rsvpId}/reject-attendee")
    public ResponseEntity<?> rejectAttendee(@PathVariable Long id,
                                            @PathVariable Long rsvpId,
                                            @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(rsvpService.rejectAttendee(getAuthenticatedEmail(), id, rsvpId, body != null ? body : Map.of()));
    }

    // ── Refund Endpoints ──────────────────────────────────────────────────

    @PostMapping("/{id}/rsvp/refund")
    public ResponseEntity<?> requestRefund(@PathVariable Long id,
                                           @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(rsvpService.requestRefund(getAuthenticatedEmail(), id, body != null ? body : Map.of()));
    }

    /**
     * Approve refund — host uploads proof of refund.
     *
     * Previously the broad catch(Exception) swallowed ResponseStatusException
     * from the service layer, which caused the connection to reset instead of
     * returning a proper error response. Now ResponseStatusException is always
     * re-thrown so the client receives the correct HTTP status and message.
     */
    @PostMapping("/{id}/rsvp/{rsvpId}/approve-refund")
    public ResponseEntity<?> approveRefund(@PathVariable Long id,
                                           @PathVariable Long rsvpId,
                                           @RequestParam("refundProof") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Refund proof file is required"));
        }

        // Resolve and validate the upload directory first — throws 500 with a
        // clear message if the directory cannot be created, rather than
        // resetting the connection mid-stream.
        Path uploadDir = getUploadDir();

        String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path dest = uploadDir.resolve(fileName);

        try {
            Files.write(dest, file.getBytes());
            System.out.println("[Upload] Saved refund proof: " + dest);
        } catch (IOException e) {
            System.err.println("[Upload] Failed to write refund proof to disk: " + e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to save refund proof file: " + e.getMessage()
            );
        }

        // Service call — ResponseStatusException propagates naturally; any
        // unexpected runtime exception is caught and wrapped.
        try {
            return ResponseEntity.ok(rsvpService.approveRefund(
                getAuthenticatedEmail(), id, rsvpId, "events/uploads/" + fileName
            ));
        } catch (ResponseStatusException rse) {
            // Business-logic error (e.g. refund not in pending status) — propagate as-is
            System.err.println("[Upload] Business error in approveRefund: " + rse.getReason());
            throw rse;
        } catch (Exception e) {
            System.err.println("[Upload] Unexpected error in approveRefund service: " + e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to process refund approval: " + e.getMessage()
            );
        }
    }

    @PostMapping("/{id}/rsvp/{rsvpId}/reject-refund")
    public ResponseEntity<?> rejectRefund(@PathVariable Long id,
                                          @PathVariable Long rsvpId,
                                          @RequestBody(required = false) Map<String, Object> body) {
        String rejectionReason = body != null ? (String) body.get("rejectionReason") : "";
        return ResponseEntity.ok(rsvpService.rejectRefund(getAuthenticatedEmail(), id, rsvpId, rejectionReason));
    }

    @PostMapping("/{id}/rsvp/acknowledge-refund")
    public ResponseEntity<?> acknowledgeRefund(@PathVariable Long id,
                                               @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(rsvpService.acknowledgeRefund(getAuthenticatedEmail(), id, body));
    }

    // ── Remove Attendee from History (Host removes) ────────────────────────

    @PostMapping("/{id}/rsvp/{rsvpId}/remove-from-history")
    public ResponseEntity<?> removeAttendeeFromHistory(@PathVariable Long id,
                                                       @PathVariable Long rsvpId) {
        return ResponseEntity.ok(rsvpService.removeAttendeeFromHistory(getAuthenticatedEmail(), id, rsvpId));
    }

    // ── Remove Event from Attending List (Guest removes) ──────────────────

    @DeleteMapping("/{id}/rsvp/remove-from-list")
    public ResponseEntity<?> removeFromAttendingList(@PathVariable Long id) {
        return ResponseEntity.ok(rsvpService.removeFromAttendingList(getAuthenticatedEmail(), id));
    }

    // ── Cancel Event (Host cancels event) ──────────────────────────────────

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelEvent(@PathVariable Long id,
                                         @RequestBody(required = false) Map<String, Object> body) {
        String reason = body != null ? (String) body.get("reason") : null;
        return ResponseEntity.ok(eventService.cancelEvent(getAuthenticatedEmail(), id, reason));
    }

    // ── Payment proof upload ──────────────────────────────────────────────

    @PostMapping("/{id}/rsvp/payment-proof")
    public ResponseEntity<?> submitPaymentProof(@PathVariable Long id,
                                                @RequestParam("paymentProof") MultipartFile file,
                                                @RequestParam(value = "acknowledged", required = false) Boolean acknowledged) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Payment proof file is required"));
        }

        Path uploadDir = getUploadDir();
        String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path dest = uploadDir.resolve(fileName);

        try {
            Files.write(dest, file.getBytes());
            System.out.println("[Upload] Saved payment proof: " + dest);
        } catch (IOException e) {
            System.err.println("[Upload] Failed to write payment proof to disk: " + e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to save payment proof file: " + e.getMessage()
            );
        }

        if (Boolean.TRUE.equals(acknowledged)) {
            System.out.println("[Upload] User acknowledged refund policy for event " + id);
        }

        try {
            return ResponseEntity.ok(rsvpService.submitPaymentProof(
                getAuthenticatedEmail(), id, "events/uploads/" + fileName
            ));
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            System.err.println("[Upload] Unexpected error in submitPaymentProof service: " + e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to process payment proof: " + e.getMessage()
            );
        }
    }

    // ── File serving ──────────────────────────────────────────────────────

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
        } catch (ResponseStatusException rse) {
            throw rse;
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