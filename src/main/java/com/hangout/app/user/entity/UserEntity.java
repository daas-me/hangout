package com.hangout.app.user.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstname;

    @Column(nullable = false)
    private String lastname;

    private LocalDate birthdate;

    private Integer age;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    private String role = "user";

    @Column(columnDefinition = "BYTEA")
    private byte[] photo;

    @Column(name = "phone")
    private String phone;

    @Column(name = "city")
    private String city;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "street")
    private String street;

    @Column(name = "state")
    private String state;

    @Column(name = "country")
    private String country;

    @Column(name = "zipcode")
    private String zipcode;

    @Column(name = "gender")
    private String gender;

    // Notification preferences (all default to true)
    @Column(name = "notif_new_rsvp", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifNewRsvp = true;

    @Column(name = "notif_payment_proof", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifPaymentProof = true;

    @Column(name = "notif_rsvp_cancelled", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifRsvpCancelled = true;

    @Column(name = "notif_refund_request", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifRefundRequest = true;

    @Column(name = "notif_refund_acknowledged", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifRefundAcknowledged = true;

    @Column(name = "notif_payment_approved", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifPaymentApproved = true;

    @Column(name = "notif_payment_rejected", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifPaymentRejected = true;

    @Column(name = "notif_rsvp_rejected", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifRsvpRejected = true;

    @Column(name = "notif_refund_processed", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifRefundProcessed = true;

    @Column(name = "notif_refund_completed", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifRefundCompleted = true;

    @Column(name = "notif_event_cancelled", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifEventCancelled = true;

    @Column(name = "notif_event_deleted", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifEventDeleted = true;

    @Column(name = "notif_seat_assigned", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifSeatAssigned = true;

    @Column(name = "notif_event_reminder", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notifEventReminder = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFirstname() { return firstname; }
    public void setFirstname(String firstname) { this.firstname = firstname; }
    public String getLastname() { return lastname; }
    public void setLastname(String lastname) { this.lastname = lastname; }
    public LocalDate getBirthdate() { return birthdate; }
    public void setBirthdate(LocalDate birthdate) { this.birthdate = birthdate; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public byte[] getPhoto() { return photo; }
    public void setPhoto(byte[] photo) { this.photo = photo; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getStreet() { return street; }
    public void setStreet(String street) { this.street = street; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getZipcode() { return zipcode; }
    public void setZipcode(String zipcode) { this.zipcode = zipcode; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Notification preference getters and setters
    public Boolean getNotifNewRsvp() { return notifNewRsvp; }
    public void setNotifNewRsvp(Boolean notifNewRsvp) { this.notifNewRsvp = notifNewRsvp; }

    public Boolean getNotifPaymentProof() { return notifPaymentProof; }
    public void setNotifPaymentProof(Boolean notifPaymentProof) { this.notifPaymentProof = notifPaymentProof; }

    public Boolean getNotifRsvpCancelled() { return notifRsvpCancelled; }
    public void setNotifRsvpCancelled(Boolean notifRsvpCancelled) { this.notifRsvpCancelled = notifRsvpCancelled; }

    public Boolean getNotifRefundRequest() { return notifRefundRequest; }
    public void setNotifRefundRequest(Boolean notifRefundRequest) { this.notifRefundRequest = notifRefundRequest; }

    public Boolean getNotifRefundAcknowledged() { return notifRefundAcknowledged; }
    public void setNotifRefundAcknowledged(Boolean notifRefundAcknowledged) { this.notifRefundAcknowledged = notifRefundAcknowledged; }

    public Boolean getNotifPaymentApproved() { return notifPaymentApproved; }
    public void setNotifPaymentApproved(Boolean notifPaymentApproved) { this.notifPaymentApproved = notifPaymentApproved; }

    public Boolean getNotifPaymentRejected() { return notifPaymentRejected; }
    public void setNotifPaymentRejected(Boolean notifPaymentRejected) { this.notifPaymentRejected = notifPaymentRejected; }

    public Boolean getNotifRsvpRejected() { return notifRsvpRejected; }
    public void setNotifRsvpRejected(Boolean notifRsvpRejected) { this.notifRsvpRejected = notifRsvpRejected; }

    public Boolean getNotifRefundProcessed() { return notifRefundProcessed; }
    public void setNotifRefundProcessed(Boolean notifRefundProcessed) { this.notifRefundProcessed = notifRefundProcessed; }

    public Boolean getNotifRefundCompleted() { return notifRefundCompleted; }
    public void setNotifRefundCompleted(Boolean notifRefundCompleted) { this.notifRefundCompleted = notifRefundCompleted; }

    public Boolean getNotifEventCancelled() { return notifEventCancelled; }
    public void setNotifEventCancelled(Boolean notifEventCancelled) { this.notifEventCancelled = notifEventCancelled; }

    public Boolean getNotifEventDeleted() { return notifEventDeleted; }
    public void setNotifEventDeleted(Boolean notifEventDeleted) { this.notifEventDeleted = notifEventDeleted; }

    public Boolean getNotifSeatAssigned() { return notifSeatAssigned; }
    public void setNotifSeatAssigned(Boolean notifSeatAssigned) { this.notifSeatAssigned = notifSeatAssigned; }

    public Boolean getNotifEventReminder() { return notifEventReminder; }
    public void setNotifEventReminder(Boolean notifEventReminder) { this.notifEventReminder = notifEventReminder; }
}