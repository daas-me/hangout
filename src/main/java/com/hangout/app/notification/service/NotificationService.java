package com.hangout.app.notification.service;

import com.hangout.app.notification.entity.NotificationEntity;
import com.hangout.app.notification.repository.NotificationRepository;
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
import java.util.stream.Collectors;

@Service
public class NotificationService {

    @Autowired private NotificationRepository notificationRepository;
    @Autowired private UserRepository userRepository;

    // ── Internal helper — called by other services ────────────────────────────

    /**
     * Creates and persists a notification.
     * Checks user's notification preferences first — skips creation if disabled.
     * Safe to call from any service; logs errors so notification
     * failures can be debugged without breaking the main action.
     */
    public void create(UserEntity user,
                       String type,
                       String title,
                       String body,
                       Long referenceId,
                       String referenceType) {
        try {
            // Check if user has enabled this notification type
            if (!isNotificationTypeEnabled(user, type)) {
                System.out.println("[NotificationService] ✓ Notification skipped (disabled): type=" + type + 
                    ", recipient=" + user.getEmail());
                return;
            }

            NotificationEntity n = new NotificationEntity();
            n.setUser(user);
            n.setType(type);
            n.setTitle(title);
            n.setBody(body);
            n.setReferenceId(referenceId);
            n.setReferenceType(referenceType);
            notificationRepository.save(n);
            System.out.println("[NotificationService] ✓ Notification created: type=" + type + 
                ", recipient=" + user.getEmail() + 
                ", title=" + title);
        } catch (Exception e) {
            System.err.println("[NotificationService] ✗ Failed to create notification: type=" + type + 
                ", recipient=" + (user != null ? user.getEmail() : "null") + 
                ", error=" + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Checks if a user has enabled a specific notification type.
     */
    private boolean isNotificationTypeEnabled(UserEntity user, String type) {
        switch (type) {
            case "NEW_RSVP":
                return user.getNotifNewRsvp() != null && user.getNotifNewRsvp();
            case "PAYMENT_PROOF":
                return user.getNotifPaymentProof() != null && user.getNotifPaymentProof();
            case "RSVP_CANCELLED":
                return user.getNotifRsvpCancelled() != null && user.getNotifRsvpCancelled();
            case "REFUND_REQUEST":
                return user.getNotifRefundRequest() != null && user.getNotifRefundRequest();
            case "REFUND_ACKNOWLEDGED":
                return user.getNotifRefundAcknowledged() != null && user.getNotifRefundAcknowledged();
            case "PAYMENT_APPROVED":
                return user.getNotifPaymentApproved() != null && user.getNotifPaymentApproved();
            case "PAYMENT_REJECTED":
                return user.getNotifPaymentRejected() != null && user.getNotifPaymentRejected();
            case "RSVP_REJECTED":
                return user.getNotifRsvpRejected() != null && user.getNotifRsvpRejected();
            case "REFUND_PROCESSED":
                return user.getNotifRefundProcessed() != null && user.getNotifRefundProcessed();
            case "REFUND_COMPLETED":
                return user.getNotifRefundCompleted() != null && user.getNotifRefundCompleted();
            case "EVENT_CANCELLED":
                return user.getNotifEventCancelled() != null && user.getNotifEventCancelled();
            case "EVENT_DELETED":
                return user.getNotifEventDeleted() != null && user.getNotifEventDeleted();
            case "SEAT_ASSIGNED":
                return user.getNotifSeatAssigned() != null && user.getNotifSeatAssigned();
            default:
                return true; // Unknown types are allowed
        }
    }

    // ── REST-facing methods ───────────────────────────────────────────────────

    public List<Map<String, Object>> getNotifications(String email) {
        UserEntity user = findUserOrThrow(email);
        return notificationRepository
                .findTop50ByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getUnreadCount(String email) {
        UserEntity user = findUserOrThrow(email);
        long count = notificationRepository.countByUserAndIsRead(user, false);
        return Map.of("unreadCount", count);
    }

    @Transactional
    public Map<String, Object> markRead(String email, Long notificationId) {
        UserEntity user = findUserOrThrow(email);
        NotificationEntity n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!n.getUser().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your notification");
        n.setIsRead(true);
        notificationRepository.save(n);
        System.out.println("[NotificationService] ✓ Notification marked as read: id=" + notificationId + 
            ", user=" + user.getEmail() + 
            ", type=" + n.getType());
        return toResponse(n);
    }

    @Transactional
    public Map<String, Object> markAllRead(String email) {
        UserEntity user = findUserOrThrow(email);
        notificationRepository.markAllReadForUser(user);
        System.out.println("[NotificationService] ✓ markAllRead for " + email);
        return Map.of("message", "All notifications marked as read");
    }

    @Transactional
    public Map<String, Object> deleteNotification(String email, Long notificationId) {
        UserEntity user = findUserOrThrow(email);
        NotificationEntity n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!n.getUser().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your notification");
        notificationRepository.deleteById(notificationId);
        return Map.of("message", "Notification deleted");
    }

    @Transactional
    public Map<String, Object> deleteAll(String email) {
        UserEntity user = findUserOrThrow(email);
        notificationRepository.deleteAllByUser(user);
        return Map.of("message", "All notifications deleted");
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private UserEntity findUserOrThrow(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Map<String, Object> toResponse(NotificationEntity n) {
        Map<String, Object> map = new HashMap<>();
        map.put("id",            n.getId());
        map.put("type",          n.getType());
        map.put("title",         n.getTitle());
        map.put("body",          n.getBody());
        map.put("referenceId",   n.getReferenceId());
        map.put("referenceType", n.getReferenceType());
        map.put("isRead",        n.getIsRead());
        map.put("createdAt",     n.getCreatedAt().toString());
        return map;
    }
}