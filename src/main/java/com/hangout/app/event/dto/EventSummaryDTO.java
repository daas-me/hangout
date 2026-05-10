package com.hangout.app.event.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public class EventSummaryDTO {
    private Long id;
    private String title;
    private String imageUrl;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String location;
    private String format;
    private String eventType;
    private Integer price;
    private Integer capacity;
    private Integer attendeeCount;
    private String description;
    private Boolean isDraft;
    private String eventStatus;
    private Long hostId;
    private String hostFirstName;
    private String hostLastName;
    private String hostEmail;

    public EventSummaryDTO() {}

    public EventSummaryDTO(Long id, String title, String imageUrl, LocalDate date, LocalTime startTime,
                           LocalTime endTime, String location, String format, String eventType, Integer price,
                           Integer capacity, Integer attendeeCount, String description, Boolean isDraft,
                           String eventStatus, Long hostId, String hostFirstName, String hostLastName, String hostEmail) {
        this.id = id;
        this.title = title;
        this.imageUrl = imageUrl;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.location = location;
        this.format = format;
        this.eventType = eventType;
        this.price = price;
        this.capacity = capacity;
        this.attendeeCount = attendeeCount;
        this.description = description;
        this.isDraft = isDraft;
        this.eventStatus = eventStatus;
        this.hostId = hostId;
        this.hostFirstName = hostFirstName;
        this.hostLastName = hostLastName;
        this.hostEmail = hostEmail;
    }

    // Getters
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getImageUrl() { return imageUrl; }
    public LocalDate getDate() { return date; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public String getLocation() { return location; }
    public String getFormat() { return format; }
    public String getEventType() { return eventType; }
    public Integer getPrice() { return price; }
    public Integer getCapacity() { return capacity; }
    public Integer getAttendeeCount() { return attendeeCount; }
    public String getDescription() { return description; }
    public Boolean getIsDraft() { return isDraft; }
    public String getEventStatus() { return eventStatus; }
    public Long getHostId() { return hostId; }
    public String getHostFirstName() { return hostFirstName; }
    public String getHostLastName() { return hostLastName; }
    public String getHostEmail() { return hostEmail; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setDate(LocalDate date) { this.date = date; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public void setLocation(String location) { this.location = location; }
    public void setFormat(String format) { this.format = format; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public void setPrice(Integer price) { this.price = price; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public void setAttendeeCount(Integer attendeeCount) { this.attendeeCount = attendeeCount; }
    public void setDescription(String description) { this.description = description; }
    public void setIsDraft(Boolean isDraft) { this.isDraft = isDraft; }
    public void setEventStatus(String eventStatus) { this.eventStatus = eventStatus; }
    public void setHostId(Long hostId) { this.hostId = hostId; }
    public void setHostFirstName(String hostFirstName) { this.hostFirstName = hostFirstName; }
    public void setHostLastName(String hostLastName) { this.hostLastName = hostLastName; }
    public void setHostEmail(String hostEmail) { this.hostEmail = hostEmail; }
}
