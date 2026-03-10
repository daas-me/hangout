package com.hangout.app.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "events")
public class EventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(nullable = false)
    private String location;

    // "In-Person" | "Virtual" | "Hybrid"
    @Column(nullable = false)
    private String format;

    // "free" | "paid"
    @Column(name = "event_type", nullable = false)
    private String eventType = "free";

    @Column(nullable = false)
    private Integer price = 0;

    @Column(nullable = false)
    private Integer capacity;

    @Column(name = "attendee_count", nullable = false)
    private Integer attendeeCount = 0;

    // "reserved" | "open"
    @Column(name = "seating_type")
    private String seatingType = "open";

    @Column(columnDefinition = "TEXT")
    private String description;

    // Payment fields (only relevant when eventType = "paid")
    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "account_number")
    private String accountNumber;

    // Virtual meeting fields
    @Column(name = "virtual_platform")
    private String virtualPlatform;

    @Column(name = "virtual_link")
    private String virtualLink;

    @Column(name = "is_trending", nullable = false)
    private Boolean isTrending = false;

    @Column(name = "is_draft", nullable = false)
    private Boolean isDraft = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private UserEntity host;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    // ── Getters & Setters ──────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public Integer getPrice() { return price; }
    public void setPrice(Integer price) { this.price = price; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public Integer getAttendeeCount() { return attendeeCount; }
    public void setAttendeeCount(Integer attendeeCount) { this.attendeeCount = attendeeCount; }

    public String getSeatingType() { return seatingType; }
    public void setSeatingType(String seatingType) { this.seatingType = seatingType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getVirtualPlatform() { return virtualPlatform; }
    public void setVirtualPlatform(String virtualPlatform) { this.virtualPlatform = virtualPlatform; }

    public String getVirtualLink() { return virtualLink; }
    public void setVirtualLink(String virtualLink) { this.virtualLink = virtualLink; }

    public Boolean getIsTrending() { return isTrending; }
    public void setIsTrending(Boolean isTrending) { this.isTrending = isTrending; }

    public Boolean getIsDraft() { return isDraft; }
    public void setIsDraft(Boolean isDraft) { this.isDraft = isDraft; }

    public UserEntity getHost() { return host; }
    public void setHost(UserEntity host) { this.host = host; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}