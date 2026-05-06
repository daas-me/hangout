package com.hangout.app.event.service;

import com.hangout.app.event.model.EventEntity;
import com.hangout.app.event.model.RSVPEntity;
import com.hangout.app.event.repository.EventRepository;
import com.hangout.app.event.repository.RSVPRepository;
import com.hangout.app.user.entity.UserEntity;
import com.hangout.app.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RSVPService {

    @Autowired private RSVPRepository rsvpRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository userRepository;

    // ── Helper Methods ─────────────────────────────────────────────────────────

    private boolean hasEventPassed(EventEntity event) {
        if (event.getDate() == null) return false;
        LocalTime time = event.getEndTime() != null ? event.getEndTime()
            : event.getStartTime() != null ? event.getStartTime()
            : LocalTime.of(23, 59);
        LocalDateTime endDateTime = LocalDateTime.of(event.getDate(), time);
        return endDateTime.isBefore(LocalDateTime.now());
    }

    private String formatAttendees(Integer count) {
        if (count == null) {
            return "0 attending";
        }
        if (count >= 1000) {
            double k = count / 1000.0;
            String f = k == Math.floor(k) ? String.valueOf((int) k) : String.format("%.1f", k);
            return f + "K attending";
        }
        return count + " attending";
    }

    // ── Create/Update RSVP ─────────────────────────────────────────────────────

    public Map<String, Object> createOrUpdateRSVP(String email, Long eventId, Map<String, Object> body) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        var existingRsvp = rsvpRepository.findByEventAndUser(event, user);
        RSVPEntity rsvp = existingRsvp.orElseGet(() -> new RSVPEntity());

        rsvp.setEvent(event);
        rsvp.setUser(user);

        // Hard-reset ALL transaction state on every new RSVP
        rsvp.setIsRemovedByAttendee(false);
        rsvp.setIsRemovedByHost(false);
        rsvp.setAttendeeStatus(null);
        rsvp.setAttendeeRejectionReason(null);
        rsvp.setAttendeeRejectionType(null);
        rsvp.setCancellationReason(null);
        rsvp.setPaymentProofUrl(null);
        rsvp.setPaymentStatus(null);
        rsvp.setRefundStatus(null);
        rsvp.setRefundProofUrl(null);
        rsvp.setRefundAcknowledged(null);
        rsvp.setRefundRejectionReason(null);

        boolean isPaid = event.getPrice() != null && event.getPrice() > 0;
        if (isPaid) {
            rsvp.setStatus("registered");
            rsvp.setPaymentStatus("pending");
        } else {
            rsvp.setStatus("confirmed");
            rsvp.setPaymentStatus("confirmed");
        }

        if (body.containsKey("paymentProofUrl")) {
            rsvp.setPaymentProofUrl((String) body.get("paymentProofUrl"));
            rsvp.setPaymentStatus("pending");
        }

        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);
        updateEventAttendeeCount(event);
        return toRsvpResponse(rsvp);
    }

    // ── Cancel RSVP ────────────────────────────────────────────────────────────

    public Map<String, Object> cancelRSVP(String email, Long eventId, Map<String, Object> body) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        RSVPEntity rsvp = rsvpRepository.findByEventAndUser(event, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found for this event"));

        // Check if RSVP is already cancelled - return friendly message instead of error
        if ("cancelled".equals(rsvp.getStatus())) {
            Map<String, Object> result = new HashMap<>();
            result.put("message", "RSVP was already cancelled"); // or "already cancelled"
            result.put("refundStatus", rsvp.getRefundStatus());
            return result;
        }

        // Check if attendee was rejected by host - can't cancel a rejected RSVP
        if ("rejected".equals(rsvp.getAttendeeStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This RSVP was rejected by the host and cannot be cancelled");
        }

        // Store cancellation reason if provided (for paid events requesting refunds)
        // Accept both "reason" and "message" fields
        String cancellationReason = (String) body.getOrDefault("reason", 
            (String) body.getOrDefault("message", ""));

        boolean isPaid = event.getPrice() != null && event.getPrice() > 0;
        if (isPaid && "confirmed".equals(rsvp.getStatus()) && "confirmed".equals(rsvp.getPaymentStatus())) {
            // For paid events with confirmed payment, initiate refund request instead of immediate cancellation
            rsvp.setRefundStatus("pending");
            rsvp.setCancellationReason(cancellationReason);
            // Status remains "confirmed" until refund is processed
        } else {
            // For free events or unconfirmed paid events, cancel immediately
            rsvp.setStatus("cancelled");
            rsvp.setCancellationReason(cancellationReason);
            // Update attendance count (remove from attended count)
            updateEventAttendeeCount(event);
        }

        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        Map<String, Object> result = new HashMap<>();
        if (isPaid && "confirmed".equals(rsvp.getStatus()) && "confirmed".equals(rsvp.getPaymentStatus())) {
            result.put("message", "Refund request submitted. Awaiting host approval.");
            result.put("refundStatus", "pending");
        } else {
            result.put("message", "RSVP cancelled successfully");
            result.put("refundStatus", rsvp.getRefundStatus());
        }
        return result;
    }

    // ── Get Attending Events (for current user) ─────────────────────────────────

    public List<Map<String, Object>> getAttendingEvents(String email) {
        UserEntity user = findUserOrThrow(email);
        // Use findByUser which has JOIN FETCH to prevent N+1 queries
        List<RSVPEntity> rsvps = rsvpRepository.findByUser(user);

        return rsvps.stream()
            .filter(r -> !Boolean.TRUE.equals(r.getIsRemovedByAttendee()))
            .map(rsvp -> {
                EventEntity event = rsvp.getEvent(); // Already loaded via JOIN FETCH
                
                // Check if event has passed and update status to completed
                if ("active".equals(event.getEventStatus()) && hasEventPassed(event)) {
                    event.setEventStatus("completed");
                    eventRepository.save(event);
                }
                
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
                // Event status fields (for cancellation/deletion display)
                map.put("eventStatus",       event.getEventStatus());
                map.put("eventStatusReason", event.getEventStatusReason());
                map.put("attendeeCount",      event.getAttendeeCount());
                map.put("attendees",          formatAttendees(event.getAttendeeCount()));
                map.put("description",     event.getDescription() != null ? event.getDescription() : "");
                map.put("accountNumber",   event.getAccountNumber() != null ? event.getAccountNumber() : "");
                map.put("paymentMethod",   event.getPaymentMethod() != null ? event.getPaymentMethod() : "");
                map.put("seatingType",     event.getSeatingType() != null ? event.getSeatingType() : "open");
                map.put("virtualPlatform", event.getVirtualPlatform() != null ? event.getVirtualPlatform() : "");
                map.put("virtualLink",     event.getVirtualLink() != null ? event.getVirtualLink() : "");
                map.put("placeUrl",        null); // not stored on event entity currently
                // RSVP / ticket fields
                map.put("rsvpId",              rsvp.getId());
                map.put("status",              rsvp.getStatus());
                map.put("paymentStatus",       rsvp.getPaymentStatus());
                map.put("seatNumber",          rsvp.getSeatNumber());
                map.put("ticketNumber",        "TKT-" + rsvp.getId());
                map.put("registeredAt",        rsvp.getRegisteredAt());
                map.put("cancellationReason",  rsvp.getCancellationReason());
                map.put("refundStatus",        rsvp.getRefundStatus());
                map.put("refundProofUrl",      rsvp.getRefundProofUrl());
                map.put("refundAcknowledged",  rsvp.getRefundAcknowledged());
                map.put("refundRejectionReason", rsvp.getRefundRejectionReason());
                map.put("isRemovedByAttendee", rsvp.getIsRemovedByAttendee());
                // Attendee rejection fields (for host rejection display in guest's attending tab)
                map.put("attendeeStatus",        rsvp.getAttendeeStatus());
                map.put("attendeeRejectionReason", rsvp.getAttendeeRejectionReason());
                map.put("attendeeRejectionType",  rsvp.getAttendeeRejectionType());
                // Host fields
                map.put("hostId",        event.getHost().getId());
                map.put("hostFirstName", event.getHost().getFirstname() != null ? event.getHost().getFirstname() : "");
                map.put("hostLastName",  event.getHost().getLastname() != null ? event.getHost().getLastname() : "");
                map.put("hostEmail",     event.getHost().getEmail() != null ? event.getHost().getEmail() : "");
                map.put("hostPhoto",     event.getHost().getPhoto() != null ? "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(event.getHost().getPhoto()) : null);
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

        // Get all RSVPs for this event, including cancelled ones so the host can see who cancelled
        List<RSVPEntity> rsvps = rsvpRepository.findByEvent(event).stream()
            .filter(rsvp -> !Boolean.TRUE.equals(rsvp.getIsRemovedByHost()))
            .collect(Collectors.toList());
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
        
        // Clear any stale refund data when payment is approved
        // This ensures each transaction is independent and clean
        rsvp.setRefundStatus(null);
        rsvp.setRefundProofUrl(null);
        rsvp.setRefundAcknowledged(null);
        rsvp.setRefundRejectionReason(null);
        
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

        // Keep RSVP for data preservation, just mark payment as rejected
        rsvp.setPaymentStatus("rejected");
        rsvp.setAttendeeStatus("rejected");
        rsvp.setAttendeeRejectionType("payment");
        rsvp.setAttendeeRejectionReason("Payment proof was rejected by the host.");
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        // Update attendance count (remove from confirmed count)
        updateEventAttendeeCount(event);

        return toRsvpResponse(rsvp);
    }

    // ── Confirm Attendee ───────────────────────────────────────────────────────

    public Map<String, Object> confirmAttendee(String email, Long eventId, Long rsvpId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        if (!event.getHost().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to confirm attendees");
        }

        RSVPEntity rsvp = rsvpRepository.findById(rsvpId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        if (!rsvp.getEvent().getId().equals(eventId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RSVP does not belong to this event");
        }

        // Override any previous rejection status and confirm the attendee
        // This ensures when host confirms a previously rejected guest, the status is updated
        rsvp.setAttendeeStatus("confirmed");
        rsvp.setAttendeeRejectionReason(null);  // Clear previous rejection reason
        rsvp.setAttendeeRejectionType(null);     // Clear rejection type
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        // Update attendance count (add to confirmed count)
        updateEventAttendeeCount(event);

        return toRsvpResponse(rsvp);
    }

    // ── Reject Attendee ────────────────────────────────────────────────────────

    public Map<String, Object> rejectAttendee(String email, Long eventId, Long rsvpId, Map<String, Object> body) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        if (!event.getHost().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to reject attendees");
        }

        RSVPEntity rsvp = rsvpRepository.findById(rsvpId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        if (!rsvp.getEvent().getId().equals(eventId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RSVP does not belong to this event");
        }

        // Keep RSVP for data preservation, mark as rejected with reason
        String rejectionReason = (String) body.getOrDefault("rejectionReason", "Rejected by host");
        
        // Limit character length to 500 for custom reasons
        if (rejectionReason.length() > 500) {
            rejectionReason = rejectionReason.substring(0, 500);
        }

        rsvp.setAttendeeStatus("rejected");
        rsvp.setAttendeeRejectionReason(rejectionReason);
        rsvp.setAttendeeRejectionType("attendee_tab");
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);
        
        // Update attendance count (remove from confirmed count)
        updateEventAttendeeCount(event);

        return toRsvpResponse(rsvp);
    }

    // ── Remove Attendee from List (Host removes from history) ────────────────────

    public Map<String, Object> removeAttendeeFromHistory(String email, Long eventId, Long rsvpId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        if (!event.getHost().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to remove attendees");
        }

        RSVPEntity rsvp = rsvpRepository.findById(rsvpId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        if (!rsvp.getEvent().getId().equals(eventId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RSVP does not belong to this event");
        }

        // Mark RSVP as removed by host (soft delete for history)
        rsvp.setIsRemovedByHost(true); // Using this flag to mark as removed by any party
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        return Map.of("message", "Attendee removed from history successfully");
    }

    // ── Remove Attendee from Attending List (Guest removes) ──────────────────────

    public Map<String, Object> removeFromAttendingList(String email, Long eventId) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        RSVPEntity rsvp = rsvpRepository.findByEventAndUser(event, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        // Mark RSVP as removed by attendee (soft delete for history)
        rsvp.setIsRemovedByAttendee(true);
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        return Map.of("message", "Event removed from your attending list");
    }

    // ── Handle Event Cancellation (when host cancels/deletes event) ───────────────

    public Map<String, Object> handleEventCancellation(Long eventId, String reason) {
        EventEntity event = findEventOrThrow(eventId);

        // Mark all RSVPs with the event's cancellation status and reason
        List<RSVPEntity> rsvps = rsvpRepository.findByEvent(event);
        for (RSVPEntity rsvp : rsvps) {
            if (!rsvp.getStatus().equals("cancelled")) {
                // Store the event cancellation reason in RSVP for guest visibility
                rsvp.setCancellationReason(reason != null ? reason : "Event was cancelled by the host");
                rsvp.setUpdatedAt(LocalDateTime.now());
                rsvpRepository.save(rsvp);
            }
        }

        return Map.of(
            "message", "Event cancellation notified to all attendees",
            "affectedRsvps", rsvps.size()
        );
    }

    // ── Request Refund ───────────────────────────────────────────────────────

    public Map<String, Object> requestRefund(String email, Long eventId, Map<String, Object> body) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        RSVPEntity rsvp = rsvpRepository.findByEventAndUser(event, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        // Check if event is paid
        if (!"paid".equals(event.getEventType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refunds are only available for paid events");
        }

        // Check if RSVP is confirmed (payment approved)
        if (!"confirmed".equals(rsvp.getStatus()) || !"confirmed".equals(rsvp.getPaymentStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only confirmed attendees can request refunds");
        }

        // Check if refund is already requested or processed
        if (rsvp.getRefundStatus() != null && !"rejected".equals(rsvp.getRefundStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refund already requested or processed");
        }

        String refundReason = (String) body.getOrDefault("refundReason", "");

        // Set RSVP status to pending review (not cancelled yet)
        rsvp.setRefundStatus("pending");
        rsvp.setCancellationReason(refundReason); // Store refund reason in cancellation_reason field
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        return toRsvpResponse(rsvp);
    }

    // ── Approve Refund ────────────────────────────────────────────────────────

    public Map<String, Object> approveRefund(String email, Long eventId, Long rsvpId, String refundProofUrl) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        if (!event.getHost().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to approve refunds");
        }

        RSVPEntity rsvp = rsvpRepository.findById(rsvpId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        if (!rsvp.getEvent().getId().equals(eventId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RSVP does not belong to this event");
        }

        if (!"pending".equals(rsvp.getRefundStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refund is not in pending status");
        }

        // Store refund proof and update status
        rsvp.setRefundProofUrl(refundProofUrl);
        rsvp.setRefundStatus("waiting_acknowledgement");
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        return toRsvpResponse(rsvp);
    }

    // ── Reject Refund ─────────────────────────────────────────────────────────

    public Map<String, Object> rejectRefund(String email, Long eventId, Long rsvpId, String rejectionReason) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        if (!event.getHost().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to reject refunds");
        }

        RSVPEntity rsvp = rsvpRepository.findById(rsvpId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        if (!rsvp.getEvent().getId().equals(eventId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RSVP does not belong to this event");
        }

        if (!"pending".equals(rsvp.getRefundStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refund is not in pending status");
        }

        // Reset refund status and clear refund-related fields
        rsvp.setRefundStatus("rejected");
        rsvp.setRefundProofUrl(null);
        rsvp.setRefundAcknowledged(null);
        rsvp.setRefundRejectionReason(rejectionReason);
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        return toRsvpResponse(rsvp);
    }

    // ── Acknowledge Refund ────────────────────────────────────────────────────

    public Map<String, Object> acknowledgeRefund(String email, Long eventId, Map<String, Object> body) {
        UserEntity user = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(eventId);

        RSVPEntity rsvp = rsvpRepository.findByEventAndUser(event, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RSVP not found"));

        if (!"waiting_acknowledgement".equals(rsvp.getRefundStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refund is not waiting for acknowledgement");
        }

        String acknowledgement = (String) body.get("acknowledgement"); // "received" or "rejected"
        String rejectionReason = (String) body.get("rejectionReason");

        if ("received".equals(acknowledgement)) {
            // Guest confirms they received the refund
            rsvp.setRefundAcknowledged("received");
            rsvp.setStatus("cancelled"); // Now mark as cancelled
            rsvp.setRefundStatus("completed");
        } else if ("rejected".equals(acknowledgement)) {
            // Guest rejects the refund proof, provide reason
            rsvp.setRefundAcknowledged("rejected");
            rsvp.setRefundRejectionReason(rejectionReason);
            rsvp.setRefundStatus("pending"); // Go back to pending for host to re-upload proof
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid acknowledgement value");
        }

        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        // Update attendee count when refund is completed
        if ("completed".equals(rsvp.getRefundStatus())) {
            updateEventAttendeeCount(event);
        }

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
        
        // Clear any stale refund data when resubmitting payment proof
        // This ensures payment submission doesn't carry over old refund state
        rsvp.setRefundStatus(null);
        rsvp.setRefundProofUrl(null);
        rsvp.setRefundAcknowledged(null);
        rsvp.setRefundRejectionReason(null);
        
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
            RSVPEntity rsvpEntity = rsvp.get();
            
            // Filter out cancelled RSVPs or rejected attendees to match host view
            // This ensures guest doesn't see themselves as RSVP'd when:
            // - They've cancelled their RSVP (status = "cancelled")
            // - Host has rejected them (attendeeStatus = "rejected")
            if ("cancelled".equals(rsvpEntity.getStatus()) || 
                "rejected".equals(rsvpEntity.getAttendeeStatus())) {
                return Map.of("rsvped", false);
            }
            
            return toRsvpResponse(rsvpEntity);
        } else {
            return Map.of("rsvped", false);
        }
    }

    // ── Helper Methods ─────────────────────────────────────────────────────────

    /**
     * Updates event attendee count. Only counts confirmed RSVPs.
     * For free events, RSVPs are immediately confirmed.
     * For paid events, RSVPs are confirmed only after payment approval.
     */
    private void updateEventAttendeeCount(EventEntity event) {
        // Count only confirmed RSVPs (approved attendees)
        long count = rsvpRepository.countConfirmedExcludingRejected(event, "confirmed");
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
        map.put("attendeeStatus", rsvp.getAttendeeStatus());
        map.put("attendeeRejectionReason", rsvp.getAttendeeRejectionReason());
        map.put("attendeeRejectionType", rsvp.getAttendeeRejectionType());
        map.put("refundStatus", rsvp.getRefundStatus());
        map.put("refundProofUrl", rsvp.getRefundProofUrl());
        map.put("refundAcknowledged", rsvp.getRefundAcknowledged());
        map.put("refundRejectionReason", rsvp.getRefundRejectionReason());
        map.put("rsvped",        true);
        return map;
    }

    private Map<String, Object> toAttendeeResponse(RSVPEntity rsvp) {
        Map<String, Object> map = new HashMap<>();
        map.put("id",            rsvp.getId());
        map.put("name",          rsvp.getUser().getFirstname() + " " + rsvp.getUser().getLastname());
        map.put("email",         rsvp.getUser().getEmail());
        map.put("photo",         rsvp.getUser().getPhoto() != null ? "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(rsvp.getUser().getPhoto()) : null);
        map.put("photoUrl",      rsvp.getUser().getPhoto() != null ? "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(rsvp.getUser().getPhoto()) : null);
        map.put("seatNumber",    rsvp.getSeatNumber() != null ? rsvp.getSeatNumber() : "TBD");
        map.put("registeredAt",  rsvp.getRegisteredAt());
        map.put("status",        rsvp.getStatus());
        map.put("paymentStatus", rsvp.getPaymentStatus());
        map.put("paymentProofUrl", rsvp.getPaymentProofUrl());
        map.put("cancellationReason", rsvp.getCancellationReason());
        map.put("refundStatus",   rsvp.getRefundStatus());
        map.put("attendeeStatus", rsvp.getAttendeeStatus());
        map.put("attendeeRejectionReason", rsvp.getAttendeeRejectionReason());
        map.put("attendeeRejectionType", rsvp.getAttendeeRejectionType());
        return map;
    }
}