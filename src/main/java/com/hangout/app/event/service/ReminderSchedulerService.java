package com.hangout.app.event.service;

import com.hangout.app.event.entity.EventEntity;
import com.hangout.app.event.entity.RSVPEntity;
import com.hangout.app.event.repository.EventRepository;
import com.hangout.app.event.repository.RSVPRepository;
import com.hangout.app.notification.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReminderSchedulerService {

    @Autowired private EventRepository    eventRepository;
    @Autowired private RSVPRepository     rsvpRepository;
    @Autowired private NotificationService notificationService;

    // Runs every 30 minutes
    @Scheduled(fixedDelay = 30 * 60 * 1000)
    @Transactional
    public void sendReminders() {
        LocalDateTime now = LocalDateTime.now();
        System.out.println("[ReminderScheduler] Running at " + now);

        List<EventEntity> upcomingEvents = eventRepository.findPublishedEventsByDateRange(
            LocalDate.now(),
            LocalDate.now().plusDays(2)
        );

        for (EventEntity event : upcomingEvents) {
            if (!"active".equals(event.getEventStatus())) continue;
            if (Boolean.TRUE.equals(event.getIsDraft()))    continue;

            LocalDateTime eventStart = buildEventStart(event);
            if (eventStart == null) continue;

            long minutesUntil = Duration.between(now, eventStart).toMinutes();

            List<RSVPEntity> rsvps = rsvpRepository.findByEvent(event);

            for (RSVPEntity rsvp : rsvps) {
                if ("cancelled".equals(rsvp.getStatus()))          continue;
                if ("rejected".equals(rsvp.getAttendeeStatus()))   continue;

                // 24-hour reminder (fires between 23h50m and 24h10m before start)
                if (!Boolean.TRUE.equals(rsvp.getReminder24hSent())
                        && minutesUntil >= 1430 && minutesUntil <= 1450) {

                    String timeLabel = formatTime(event);
                    notificationService.create(
                        rsvp.getUser(),
                        "EVENT_REMINDER",
                        "Reminder: HangOut Tomorrow 📅",
                        "\"" + event.getTitle() + "\" is happening tomorrow"
                            + (timeLabel.isEmpty() ? "." : " at " + timeLabel + "."),
                        event.getId(),
                        "event"
                    );

                    rsvp.setReminder24hSent(true);
                    rsvpRepository.save(rsvp);
                    System.out.println("[ReminderScheduler] 24h reminder sent → "
                        + rsvp.getUser().getEmail() + " for event " + event.getTitle());
                }

                // 1-hour reminder (fires between 50m and 70m before start)
                if (!Boolean.TRUE.equals(rsvp.getReminder1hSent())
                        && minutesUntil >= 50 && minutesUntil <= 70) {

                    String timeLabel = formatTime(event);
                    notificationService.create(
                        rsvp.getUser(),
                        "EVENT_REMINDER",
                        "Starting Soon! ⏰",
                        "\"" + event.getTitle() + "\" starts in about 1 hour"
                            + (timeLabel.isEmpty() ? "." : " at " + timeLabel + "."),
                        event.getId(),
                        "event"
                    );

                    rsvp.setReminder1hSent(true);
                    rsvpRepository.save(rsvp);
                    System.out.println("[ReminderScheduler] 1h reminder sent → "
                        + rsvp.getUser().getEmail() + " for event " + event.getTitle());
                }
            }

            sendHostReminder(event, minutesUntil, now);
        }
    }

    // Pending payment reminder — runs every 6 hours
    @Scheduled(fixedDelay = 6 * 60 * 60 * 1000)
    @Transactional
    public void sendPendingPaymentReminders() {
        List<EventEntity> upcomingEvents = eventRepository.findPublishedEventsByDateRange(
            LocalDate.now(),
            LocalDate.now().plusDays(7)
        );

        for (EventEntity event : upcomingEvents) {
            if (!"active".equals(event.getEventStatus())) continue;
            if (event.getPrice() == null || event.getPrice() == 0) continue;

            List<RSVPEntity> rsvps = rsvpRepository.findByEvent(event);
            long pendingCount = rsvps.stream()
                .filter(r -> "pending".equals(r.getPaymentStatus()))
                .filter(r -> r.getPaymentProofUrl() != null)
                .count();

            if (pendingCount > 0) {
                notificationService.create(
                    event.getHost(),
                    "PAYMENT_PROOF",
                    "Pending Payments Awaiting Review",
                    pendingCount + " payment proof(s) for \""
                        + event.getTitle() + "\" still need your approval.",
                    event.getId(),
                    "event"
                );
                System.out.println("[ReminderScheduler] Pending payment reminder → host "
                    + event.getHost().getEmail() + ", count=" + pendingCount);
            }
        }
    }

    private void sendHostReminder(EventEntity event, long minutesUntil, LocalDateTime now) {
        if (minutesUntil >= 1430 && minutesUntil <= 1450) {
            String timeLabel = formatTime(event);
            notificationService.create(
                event.getHost(),
                "EVENT_REMINDER",
                "Your HangOut is Tomorrow 🎉",
                "\"" + event.getTitle() + "\" is happening tomorrow"
                    + (timeLabel.isEmpty() ? "." : " at " + timeLabel + "."),
                event.getId(),
                "event"
            );
        }
    }

    private LocalDateTime buildEventStart(EventEntity event) {
        if (event.getDate() == null) return null;
        LocalTime time = event.getStartTime() != null
            ? event.getStartTime() : LocalTime.of(0, 0);
        return LocalDateTime.of(event.getDate(), time);
    }

    private String formatTime(EventEntity event) {
        if (event.getStartTime() == null) return "";
        return event.getStartTime().format(DateTimeFormatter.ofPattern("h:mm a"));
    }
}
