package com.hangout.app.event.service;

import com.hangout.app.event.model.EventEntity;
import com.hangout.app.event.model.RSVPEntity;
import com.hangout.app.event.repository.EventRepository;
import com.hangout.app.event.repository.RSVPRepository;
import com.hangout.app.user.model.UserEntity;
import com.hangout.app.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RSVPService {

    @Autowired private RSVPRepository rsvpRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository userRepository;

    // ── Create/Update RSVP ─────────────────────────────────────────────────────

    public Map<String, Object> createOrUpdateRSVP(String email, Long eventId, Map<String, Object> body) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        var existingRsvp = rsvpRepository.findByEventAndUser(event, user);
        RSVPEntity rsvp = existingRsvp.orElseGet(() -> new RSVPEntity());

        rsvp.setEvent(event);
        rsvp.setUser(user);
        rsvp.setStatus("registered");

        if (body.containsKey("paymentProofUrl")) {
            rsvp.setPaymentProofUrl((String) body.get("paymentProofUrl"));
            rsvp.setPaymentStatus("pending");
        }

        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        // Only count confirmed RSVPs (payment approved) for attendance
        // For paid events, only increment count when payment is approved
        updateEventAttendeeCount(event);

        return toRsvpResponse(rsvp);
    }

    // ── Cancel RSVP ────────────────────────────────────────────────────────────

    public Map<String, Object> cancelRSVP(String email, Long eventId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        RSVPEntity rsvp = rsvpRepository.findByEventAndUser(event, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        rsvpRepository.delete(rsvp);

        updateEventAttendeeCount(event);

        return Map.of("message", "RSVP cancelled successfully");
    }

    // ── Get Attending Events (for current user) ─────────────────────────────────

    public List<Map<String, Object>> getAttendingEvents(String email) {
        UserEntity user = findUserOrThrow(email);
        List<RSVPEntity> rsvps = rsvpRepository.findByUser(user);

        return rsvps.stream()
            .filter(r -> !r.getStatus().equals("cancelled"))
            .map(rsvp -> {
                EventEntity event = rsvp.getEvent();
                Map<String, Object> map = new HashMap<>();
                // Event fields
                map.put("id",          event.getId());
                map.put("title",       event.getTitle());
                map.put("imageUrl",    event.getImageUrl());
                map.put("date",        event.getDate().toString());
                map.put("startTime",   event.getStartTime() != null ? event.getStartTime().toString() : null);
                map.put("endTime",     event.getEndTime()   != null ? event.getEndTime().toString()   : null);
                map.put("location",    event.getLocation());
                map.put("format",      event.getFormat());
                map.put("price",       event.getPrice());
                map.put("capacity",    event.getCapacity());
                map.put("isDraft",     event.getIsDraft());
                // RSVP / ticket fields
                map.put("rsvpId",        rsvp.getId());
                map.put("rsvpStatus",    rsvp.getStatus());
                map.put("paymentStatus", rsvp.getPaymentStatus());
                map.put("seat",          rsvp.getSeatNumber());
                map.put("ticketNumber",  "TKT-" + rsvp.getId());
                map.put("registeredAt",  rsvp.getRegisteredAt());
                return map;
            })
            .collect(Collectors.toList());
    }

    // ── Get Event Attendees (for host) ──────────────────────────────────────────

    public List<Map<String, Object>> getEventAttendees(String email, Long eventId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        if (!event.getHost().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to view attendees");
        }

        List<RSVPEntity> rsvps = rsvpRepository.findByEventAndStatus(event, "registered");
        return rsvps.stream().map(this::toAttendeeResponse).collect(Collectors.toList());
    }

    // ── Approve Payment ────────────────────────────────────────────────────────

    public Map<String, Object> approvePayment(String email, Long eventId, Long rsvpId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        if (!event.getHost().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to approve payments");
        }

        RSVPEntity rsvp = rsvpRepository.findById(rsvpId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        if (!rsvp.getEvent().getId().equals(eventId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RSVP does not belong to this event");
        }

        rsvp.setPaymentStatus("confirmed");
        rsvp.setStatus("confirmed");
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        // Increment attendance count when payment is approved
        updateEventAttendeeCount(event);

        return toRsvpResponse(rsvp);
    }

    // ── Reject Payment ─────────────────────────────────────────────────────────

    public Map<String, Object> rejectPayment(String email, Long eventId, Long rsvpId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        if (!event.getHost().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to reject payments");
        }

        RSVPEntity rsvp = rsvpRepository.findById(rsvpId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        if (!rsvp.getEvent().getId().equals(eventId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RSVP does not belong to this event");
        }

        rsvp.setPaymentStatus("rejected");
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        return toRsvpResponse(rsvp);
    }

    // ── Submit Payment Proof ───────────────────────────────────────────────────

    public Map<String, Object> submitPaymentProof(String email, Long eventId, String fileName) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        RSVPEntity rsvp = rsvpRepository.findByEventAndUser(event, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found for this event"));

        // Store the filename as the payment proof URL (in production, this would be a cloud URL)
        rsvp.setPaymentProofUrl(fileName);
        rsvp.setPaymentStatus("pending");
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        return toRsvpResponse(rsvp);
    }

    // ── Check RSVP Status ──────────────────────────────────────────────────────

    public Map<String, Object> checkRSVPStatus(String email, Long eventId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        var rsvp = rsvpRepository.findByEventAndUser(event, user);

        if (rsvp.isPresent()) {
            return toRsvpResponse(rsvp.get());
        } else {
            return Map.of("rsvped", false);
        }
    }

    // ── Helper Methods ─────────────────────────────────────────────────────────

    /**
     * Updates event attendee count. Only counts confirmed RSVPs (payment approved).
     * For free events, counts all registered RSVPs.
     * For paid events, counts only confirmed RSVPs.
     */
    private void updateEventAttendeeCount(EventEntity event) {
        long count;
        if (event.getPrice() != null && event.getPrice() > 0) {
            // For paid events, only count confirmed RSVPs (payment approved)
            count = rsvpRepository.countByEventAndStatus(event, "confirmed");
        } else {
            // For free events, count all registered RSVPs
            count = rsvpRepository.countByEventAndStatus(event, "registered");
        }
        event.setAttendeeCount(Math.toIntExact(count));
        eventRepository.save(event);
    }

    /**
     * Recalculates and corrects attendance count for an event.
     * Used to fix any stale or incorrect counts in the database.
     */
    public Map<String, Object> recalculateAttendanceCount(Long eventId) {
        EventEntity event = findEventOrThrow(eventId);
        updateEventAttendeeCount(event);
        return Map.of(
            "eventId", event.getId(),
            "attendeeCount", event.getAttendeeCount(),
            "message", "Attendance count recalculated"
        );
    }

    private UserEntity findUserOrThrow(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private EventEntity findEventOrThrow(Long id) {
        return eventRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private Map<String, Object> toRsvpResponse(RSVPEntity rsvp) {
        Map<String, Object> map = new HashMap<>();
        map.put("id",            rsvp.getId());
        map.put("eventId",       rsvp.getEvent().getId());
        map.put("userId",        rsvp.getUser().getId());
        map.put("status",        rsvp.getStatus());
        map.put("paymentStatus", rsvp.getPaymentStatus());
        map.put("seatNumber",    rsvp.getSeatNumber());
        map.put("paymentProofUrl", rsvp.getPaymentProofUrl());
        map.put("registeredAt",  rsvp.getRegisteredAt());
        map.put("rsvped",        true);
        return map;
    }

    private Map<String, Object> toAttendeeResponse(RSVPEntity rsvp) {
        Map<String, Object> map = new HashMap<>();
        map.put("id",            rsvp.getId());
        map.put("name",          rsvp.getUser().getFirstname() + " " + rsvp.getUser().getLastname());
        map.put("email",         rsvp.getUser().getEmail());
        map.put("seatNumber",    rsvp.getSeatNumber() != null ? rsvp.getSeatNumber() : "TBD");
        map.put("registeredAt",  rsvp.getRegisteredAt());
        map.put("status",        rsvp.getStatus());
        map.put("paymentStatus", rsvp.getPaymentStatus());
        map.put("paymentProofUrl", rsvp.getPaymentProofUrl());
        return map;
    }
}