package com.hangout.app.notification.controller;

import com.hangout.app.notification.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired private NotificationService notificationService;

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated())
            throw new RuntimeException("Not authenticated");
        return auth.getName();
    }

    /** GET /api/notifications — fetch all (up to 50, newest first) */
    @GetMapping
    public ResponseEntity<?> getNotifications() {
        return ResponseEntity.ok(notificationService.getNotifications(currentEmail()));
    }

    /** GET /api/notifications/unread/count */
    @GetMapping("/unread/count")
    public ResponseEntity<?> getUnreadCount() {
        return ResponseEntity.ok(notificationService.getUnreadCount(currentEmail()));
    }

    /** PATCH /api/notifications/{id}/read — mark single as read */
    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markRead(currentEmail(), id));
    }

    /** PATCH /api/notifications/read-all — mark all as read */
    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllRead() {
        return ResponseEntity.ok(notificationService.markAllRead(currentEmail()));
    }

    /** DELETE /api/notifications/{id} — delete single */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOne(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.deleteNotification(currentEmail(), id));
    }

    /** DELETE /api/notifications — delete all */
    @DeleteMapping
    public ResponseEntity<?> deleteAll() {
        return ResponseEntity.ok(notificationService.deleteAll(currentEmail()));
    }
}