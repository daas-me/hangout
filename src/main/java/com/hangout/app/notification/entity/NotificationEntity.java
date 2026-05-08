package com.hangout.app.notification.entity;

import com.hangout.app.user.entity.UserEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class NotificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    /**
     * Notification types:
     *
     * HOST-side:
     *   NEW_RSVP            — someone RSVPd to your event
     *   PAYMENT_PROOF       — attendee uploaded payment proof
     *   RSVP_CANCELLED      — attendee cancelled their RSVP
     *   REFUND_REQUEST      — attendee requested a refund
     *   REFUND_ACKNOWLEDGED — attendee confirmed/rejected refund receipt
     *
     * GUEST-side:
     *   PAYMENT_APPROVED    — host approved your payment
     *   PAYMENT_REJECTED    — host rejected your payment
     *   RSVP_REJECTED       — host rejected your RSVP
     *   REFUND_PROCESSED    — host processed your refund (waiting_acknowledgement)
     *   REFUND_COMPLETED    — refund flow finished
     *   EVENT_CANCELLED     — the event you RSVPd to was cancelled
     *   EVENT_DELETED       — the event you RSVPd to was deleted
     *   SEAT_ASSIGNED       — host assigned you a seat
     *
     * GENERAL:
     *   NEW_MESSAGE         — new chat message (optional, if you want in-app)
     */
    @Column(nullable = false)
    private String type;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    /** Optional deep-link / context (e.g. eventId) */
    @Column(name = "reference_id")
    private Long referenceId;

    /** e.g. "event" | "rsvp" | "message" */
    @Column(name = "reference_type")
    private String referenceType;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public UserEntity getUser() { return user; }
    public void setUser(UserEntity user) { this.user = user; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public Long getReferenceId() { return referenceId; }
    public void setReferenceId(Long referenceId) { this.referenceId = referenceId; }

    public String getReferenceType() { return referenceType; }
    public void setReferenceType(String referenceType) { this.referenceType = referenceType; }

    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}