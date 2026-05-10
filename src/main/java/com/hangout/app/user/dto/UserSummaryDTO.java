package com.hangout.app.user.dto;

public class UserSummaryDTO {
    private Long id;
    private String firstname;
    private String lastname;
    private String email;
    private String city;
    private String bio;

    public UserSummaryDTO() {}

    public UserSummaryDTO(Long id, String firstname, String lastname, String email, String city, String bio) {
        this.id = id;
        this.firstname = firstname;
        this.lastname = lastname;
        this.email = email;
        this.city = city;
        this.bio = bio;
    }

    // Getters
    public Long getId() { return id; }
    public String getFirstname() { return firstname; }
    public String getLastname() { return lastname; }
    public String getEmail() { return email; }
    public String getCity() { return city; }
    public String getBio() { return bio; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setFirstname(String firstname) { this.firstname = firstname; }
    public void setLastname(String lastname) { this.lastname = lastname; }
    public void setEmail(String email) { this.email = email; }
    public void setCity(String city) { this.city = city; }
    public void setBio(String bio) { this.bio = bio; }
}
