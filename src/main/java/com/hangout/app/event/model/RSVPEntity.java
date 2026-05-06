package com.hangout.app.event.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.hangout.app.user.entity.UserEntity;

@Entity
@Table(name = "rsvps", uniqueConstraints = {
  @UniqueConstraint(columnNames = {"event_id", "user_id"})
})
public class RSVPEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private EventEntity event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    // "registered" | "confirmed" | "cancelled"
    @Column(name = "status", nullable = false)
    private String status = "registered";

    // Seat number (if reserved seating)
    @Column(name = "seat_number")
    private String seatNumber;

    // Payment status for paid events: "pending" | "confirmed" | "rejected"
    @Column(name = "payment_status")
    private String paymentStatus = "pending";

    // URL to payment proof (for paid events)
    @Column(name = "payment_proof_url", columnDefinition = "TEXT")
    private String paymentProofUrl;

    // Cancellation reason (when guest cancels)
    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    // Refund request status: null | "pending" | "approved" | "rejected" | "waiting_acknowledgement"
    @Column(name = "refund_status")
    private String refundStatus;

    // URL to refund proof (uploaded by host when approving refund)
    @Column(name = "refund_proof_url", columnDefinition = "TEXT")
    private String refundProofUrl;

    // Guest acknowledgement of refund: null | "received" | "rejected"
    @Column(name = "refund_acknowledged")
    private String refundAcknowledged;

    // Guest rejection reason for refund proof
    @Column(name = "refund_rejection_reason", columnDefinition = "TEXT")
    private String refundRejectionReason;

    // Whether the attendee has removed this from their attending list (for history)
    @Column(name = "is_removed_by_attendee")
    private Boolean isRemovedByAttendee = false;

    // Attendee status for host rejection: null | "rejected" (data preservation)
    @Column(name = "attendee_status")
    private String attendeeStatus;

    // Rejection reason for attendee rejection (with character limit)
    @Column(name = "attendee_rejection_reason", columnDefinition = "TEXT")
    private String attendeeRejectionReason;

    // Type of rejection: "payment" (via payment proof) | "attendee_tab" (via attendee tab)
    @Column(name = "attendee_rejection_type")
    private String attendeeRejectionType;

    @Column(name = "registered_at")
    private LocalDateTime registeredAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "is_removed_by_host")
    private Boolean isRemovedByHost = false;

    // ── Getters & Setters ──────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public EventEntity getEvent() { return event; }
    public void setEvent(EventEntity event) { this.event = event; }

    public UserEntity getUser() { return user; }
    public void setUser(UserEntity user) { this.user = user; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSeatNumber() { return seatNumber; }
    public void setSeatNumber(String seatNumber) { this.seatNumber = seatNumber; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getPaymentProofUrl() { return paymentProofUrl; }
    public void setPaymentProofUrl(String paymentProofUrl) { this.paymentProofUrl = paymentProofUrl; }

    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; }

    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }

    public String getRefundProofUrl() { return refundProofUrl; }
    public void setRefundProofUrl(String refundProofUrl) { this.refundProofUrl = refundProofUrl; }

    public String getRefundAcknowledged() { return refundAcknowledged; }
    public void setRefundAcknowledged(String refundAcknowledged) { this.refundAcknowledged = refundAcknowledged; }

    public String getRefundRejectionReason() { return refundRejectionReason; }
    public void setRefundRejectionReason(String refundRejectionReason) { this.refundRejectionReason = refundRejectionReason; }

    public Boolean getIsRemovedByAttendee() { return isRemovedByAttendee; }
    public void setIsRemovedByAttendee(Boolean isRemovedByAttendee) { this.isRemovedByAttendee = isRemovedByAttendee; }

    public String getAttendeeStatus() { return attendeeStatus; }
    public void setAttendeeStatus(String attendeeStatus) { this.attendeeStatus = attendeeStatus; }

    public String getAttendeeRejectionReason() { return attendeeRejectionReason; }
    public void setAttendeeRejectionReason(String attendeeRejectionReason) { this.attendeeRejectionReason = attendeeRejectionReason; }

    public String getAttendeeRejectionType() { return attendeeRejectionType; }
    public void setAttendeeRejectionType(String attendeeRejectionType) { this.attendeeRejectionType = attendeeRejectionType; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    public Boolean getIsRemovedByHost() { return isRemovedByHost; }
    public void setIsRemovedByHost(Boolean isRemovedByHost) { this.isRemovedByHost = isRemovedByHost; }
}
