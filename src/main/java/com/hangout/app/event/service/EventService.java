package com.hangout.app.event.service;

import com.hangout.app.event.model.EventEntity;
import com.hangout.app.event.repository.EventRepository;
import com.hangout.app.event.repository.RSVPRepository;
import com.hangout.app.user.entity.UserEntity;
import com.hangout.app.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class EventService {

    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository  userRepository;
    @Autowired private RSVPRepository  rsvpRepository;

    // ── Helper Methods ─────────────────────────────────────────────────────────

    private boolean hasEventPassed(EventEntity event) {
        if (event.getDate() == null) return false;
        LocalTime time = event.getEndTime() != null ? event.getEndTime()
            : event.getStartTime() != null ? event.getStartTime()
            : LocalTime.of(23, 59);
        LocalDateTime endDateTime = LocalDateTime.of(event.getDate(), time);
        return endDateTime.isBefore(LocalDateTime.now());
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public Map<String, Object> createEvent(String email, Map<String, Object> body) {
        UserEntity user = findUserOrThrow(email);

        String title   = (String) body.get("title");
        String dateStr = (String) body.get("date");

        if (title == null || title.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        if (dateStr == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date is required");

        EventEntity event = new EventEntity();
        event.setHost(user);
        event.setTitle(title.trim());
        event.setLocation(getStr(body, "location", ""));
        event.setFormat(getStr(body, "format", "In-Person"));

        try {
            event.setDate(LocalDate.parse(dateStr));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format, expected YYYY-MM-DD");
        }

        applyTimes(event, body);
        applyPriceAndCapacity(event, body);

        event.setEventType(getStr(body, "eventType", "free"));
        event.setSeatingType((String) body.get("seatingType"));
        event.setDescription((String) body.get("description"));
        event.setPaymentMethod((String) body.get("paymentMethod"));
        event.setAccountName((String) body.get("accountName"));
        event.setAccountNumber((String) body.get("accountNumber"));
        event.setVirtualPlatform((String) body.get("virtualPlatform"));
        event.setVirtualLink((String) body.get("virtualLink"));
        event.setImageUrl((String) body.get("imageUrl"));
        if (body.containsKey("noRefundPolicy")) event.setNoRefundPolicy((Boolean) body.get("noRefundPolicy"));
        event.setIsDraft(isDraft(body));

        return toResponse(eventRepository.save(event));
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public Map<String, Object> updateEvent(String email, Long id, Map<String, Object> body) {
        UserEntity  user  = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(id);

        if (!event.getHost().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");

        if (body.containsKey("title"))           event.setTitle(((String) body.get("title")).trim());
        if (body.containsKey("location"))        event.setLocation((String) body.get("location"));
        if (body.containsKey("format"))          event.setFormat((String) body.get("format"));
        if (body.containsKey("eventType"))       event.setEventType((String) body.get("eventType"));
        if (body.containsKey("seatingType"))     event.setSeatingType((String) body.get("seatingType"));
        if (body.containsKey("description"))     event.setDescription((String) body.get("description"));
        if (body.containsKey("paymentMethod"))   event.setPaymentMethod((String) body.get("paymentMethod"));
        if (body.containsKey("accountName"))     event.setAccountName((String) body.get("accountName"));
        if (body.containsKey("accountNumber"))   event.setAccountNumber((String) body.get("accountNumber"));
        if (body.containsKey("virtualPlatform")) event.setVirtualPlatform((String) body.get("virtualPlatform"));
        if (body.containsKey("virtualLink"))     event.setVirtualLink((String) body.get("virtualLink"));
        if (body.containsKey("imageUrl"))        event.setImageUrl((String) body.get("imageUrl"));
        if (body.containsKey("noRefundPolicy"))  event.setNoRefundPolicy((Boolean) body.get("noRefundPolicy"));
        if (body.containsKey("isDraft"))         event.setIsDraft(isDraft(body));

        try {
            String dateStr = (String) body.get("date");
            if (dateStr != null) event.setDate(LocalDate.parse(dateStr));

            String startStr = (String) body.get("startTime");
            if (startStr != null && !startStr.isBlank()) event.setStartTime(LocalTime.parse(startStr));

            String endStr = (String) body.get("endTime");
            if (endStr != null && !endStr.isBlank()) event.setEndTime(LocalTime.parse(endStr));
            else if (body.containsKey("endTime")) event.setEndTime(null);

            Object priceObj    = body.get("price");
            Object capacityObj = body.get("capacity");
            if (priceObj    != null) event.setPrice(Integer.parseInt(priceObj.toString()));
            if (capacityObj != null) event.setCapacity(Integer.parseInt(capacityObj.toString()));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date, time, price, or capacity");
        }

        if ("completed".equals(event.getEventStatus()) && !hasEventPassed(event)
            && !Boolean.TRUE.equals(event.getIsDraft())) {
            event.setEventStatus("active");
            event.setEventStatusReason(null);
        }

        event.setUpdatedAt(LocalDateTime.now());
        return toResponse(eventRepository.save(event));
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public void deleteEvent(String email, Long id) {
        UserEntity  user  = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(id);

        if (!event.getHost().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");

        // Mark as deleted instead of permanently deleting, to preserve history for attendees
        event.setEventStatus("deleted");
        event.setEventStatusReason("Host deleted the event");
        event.setUpdatedAt(LocalDateTime.now());
        eventRepository.save(event);
    }

    // ── Cancel Event (Host cancels an upcoming event) ────────────────────────

    public Map<String, Object> cancelEvent(String email, Long id, String reason) {
        UserEntity  user  = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(id);

        if (!event.getHost().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");

        // Mark as cancelled
        event.setEventStatus("cancelled");
        event.setEventStatusReason(reason != null ? reason : "Event was cancelled by the host");
        event.setUpdatedAt(LocalDateTime.now());
        return toResponse(eventRepository.save(event));
    }

    // ── Publish/Unpublish ─────────────────────────────────────────────────────

    public Map<String, Object> publishEvent(String email, Long id) {
        UserEntity  user  = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(id);

        if (!event.getHost().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");

        event.setIsDraft(false);
        
        // Reset completed status to active if event is now in the future
        if ("completed".equals(event.getEventStatus()) && !hasEventPassed(event)) {
            event.setEventStatus("active");
            event.setEventStatusReason(null);
        }
        
        event.setUpdatedAt(LocalDateTime.now());
        return toResponse(eventRepository.save(event));
    }

    public Map<String, Object> unpublishEvent(String email, Long id) {
        UserEntity  user  = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(id);

        if (!event.getHost().getId().equals(user.getId())) {
            System.out.println("[unpublishEvent] Forbidden: User " + user.getId() + " (" + email + 
                ") attempted to unpublish event " + id + " owned by " + event.getHost().getId());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to unpublish this event");
        }

        event.setIsDraft(true);
        event.setUpdatedAt(LocalDateTime.now());
        System.out.println("[unpublishEvent] Successfully unpublished event " + id + " by user " + email);
        return toResponse(eventRepository.save(event));
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public Map<String, Object> getEventDetails(String email, Long id) {
        EventEntity event = findEventOrThrow(id);
        
        // Check if event has passed and update status to completed
        if ("active".equals(event.getEventStatus()) && hasEventPassed(event)) {
            event.setEventStatus("completed");
            eventRepository.save(event);
        }
        
        // Check if event is draft
        boolean isDraft = event.getIsDraft() != null && event.getIsDraft();
        
        // If draft, require authentication and ownership
        if (isDraft) {
            if (email == null) {
                System.out.println("[getEventDetails] Unauthorized: Unauthenticated user tried to view draft event " + id);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, 
                    "Authentication required to view draft events");
            }
            UserEntity user = findUserOrThrow(email);
            boolean isOwner = event.getHost().getId().equals(user.getId());
            
            if (!isOwner) {
                System.out.println("[getEventDetails] Forbidden: User " + user.getId() + " (" + email + 
                    ") tried to view draft event " + id + " owned by " + event.getHost().getId());
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, 
                    "You do not have permission to view this draft event");
            }
        }
        
        // For published events, no auth required
        if (email != null) {
            System.out.println("[getEventDetails] Authenticated user " + email + " accessing published event " + id);
        } else {
            System.out.println("[getEventDetails] Unauthenticated user accessing published event " + id);
        }
        
        // Recalculate attendance count to ensure accuracy (fixes any stale counts)
        recalculateEventAttendance(event);

        Map<String, Object> response = toResponse(event);
        if (email != null && !"anonymousUser".equals(email)) {
            UserEntity user = findUserOrThrow(email);
            rsvpRepository.findByEventAndUser(event, user).ifPresent(rsvp -> {
                response.put("status",             rsvp.getStatus());
                response.put("paymentStatus",      rsvp.getPaymentStatus());
                response.put("paymentProofUrl",    rsvp.getPaymentProofUrl());
                response.put("ticketNumber",      "TKT-" + rsvp.getId());
                response.put("seatNumber",        rsvp.getSeatNumber());
                response.put("refundStatus",      rsvp.getRefundStatus());
                response.put("refundProofUrl",    rsvp.getRefundProofUrl());
                response.put("refundAcknowledged", rsvp.getRefundAcknowledged());
                response.put("refundRejectionReason", rsvp.getRefundRejectionReason());
                response.put("attendeeStatus",        rsvp.getAttendeeStatus());
                response.put("attendeeRejectionReason", rsvp.getAttendeeRejectionReason());
                response.put("attendeeRejectionType",  rsvp.getAttendeeRejectionType());
            });
        }

        return response;
    }

    public List<Map<String, Object>> getHostingEvents(String email) {
        UserEntity user = findUserOrThrow(email);
        return eventRepository
            .findByHostOrderByDateAscStartTimeAsc(user)
            .stream()
            .peek(event -> {
                // Check if event has passed and update status to completed
                if ("active".equals(event.getEventStatus()) && hasEventPassed(event)) {
                    event.setEventStatus("completed");
                    eventRepository.save(event);
                }
            })
            .map(this::toResponse).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getTodayEvents(String email) {
        findUserOrThrow(email); // auth check
        // Use database query instead of findByDate which may load draft events
        return eventRepository
            .findPublishedEventsByDate(LocalDate.now())
            .stream()
            .peek(event -> {
                // Check if event has passed and update status to completed
                if ("active".equals(event.getEventStatus()) && hasEventPassed(event)) {
                    event.setEventStatus("completed");
                    eventRepository.save(event);
                }
            })
            .map(this::toResponse).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getDiscoverEvents(String email, String search, String filter) {
        // Optional auth check - unauthenticated users can discover public events
        if (email != null) {
            try {
                findUserOrThrow(email);
            } catch (Exception e) {
                // If user lookup fails, just treat as unauthenticated
                System.out.println("[getDiscoverEvents] User lookup failed for email: " + email + ", treating as unauthenticated");
                email = null;
            }
        }
        
        LocalDate today    = LocalDate.now();
        LocalDate weekEnd  = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        LocalDate monthEnd = today.with(TemporalAdjusters.lastDayOfMonth());

        // Query database based on filter - don't load ALL events
        List<EventEntity> events = switch (filter) {
            case "today"      -> eventRepository.findPublishedEventsByDate(today);
            case "this_week"  -> eventRepository.findPublishedEventsByDateRange(today, weekEnd);
            case "this_month" -> eventRepository.findPublishedEventsByDateRange(today, monthEnd);
            default           -> eventRepository.findAllPublishedEvents();  // Only published events
        };

        // Filter by search and price if needed
        return events.stream()
            .peek(event -> {
                // Check if event has passed and update status to completed
                if ("active".equals(event.getEventStatus()) && hasEventPassed(event)) {
                    event.setEventStatus("completed");
                    eventRepository.save(event);
                }
            })
            .filter(e -> !"completed".equals(e.getEventStatus()))
            .filter(e -> search.isEmpty()
                || e.getTitle().toLowerCase().contains(search.toLowerCase())
                || e.getLocation().toLowerCase().contains(search.toLowerCase()))
            .filter(e -> switch (filter) {
                case "free"       -> e.getPrice() == 0;
                case "paid"       -> e.getPrice() > 0;
                default           -> true;
            })
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public Object[] locationSearch(String email, String q) {
        // Optional auth check - unauthenticated users can search locations
        if (email != null) {
            try {
                findUserOrThrow(email);
            } catch (Exception e) {
                // If user lookup fails, just treat as unauthenticated
                System.out.println("[locationSearch] User lookup failed for email: " + email + ", treating as unauthenticated");
                email = null;
            }
        }
        
        try {
            String url = "https://nominatim.openstreetmap.org/search"
                + "?q=" + java.net.URLEncoder.encode(q, "UTF-8")
                + "&format=json&addressdetails=1&limit=6&countrycodes=ph";

            RestTemplate rt = new RestTemplate();
            rt.getInterceptors().add((request, body, execution) -> {
                request.getHeaders().set("User-Agent", "HangOutApp/1.0");
                return execution.execute(request, body);
            });

            Object[] results = rt.getForObject(url, Object[].class);
            return results != null ? results : new Object[0];
        } catch (Exception ex) {
            return new Object[0];
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Map<String, Object> toResponse(EventEntity e) {
        String startTime = e.getStartTime() != null
            ? e.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")) : "";
        String endTime = e.getEndTime() != null
            ? e.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm")) : "";
        String timeLabel = endTime.isEmpty() ? startTime : startTime + " \u2013 " + endTime;

        Map<String, Object> map = new HashMap<>();
        map.put("id",              e.getId());
        map.put("title",           e.getTitle());
        map.put("imageUrl",        e.getImageUrl() != null ? e.getImageUrl() : "");
        map.put("date",            e.getDate().format(DateTimeFormatter.ofPattern("MMM dd, yyyy")));
        map.put("time",            timeLabel);
        map.put("startTime",       startTime);
        map.put("endTime",         endTime);
        map.put("location",        e.getLocation());
        map.put("format",          e.getFormat());
        map.put("eventType",       e.getEventType() != null ? e.getEventType() : "free");
        map.put("price",           e.getPrice());
        map.put("capacity",        e.getCapacity());
        map.put("attendeeCount",   e.getAttendeeCount());
        map.put("attendees",       formatAttendees(e.getAttendeeCount()));
        map.put("seatingType",     e.getSeatingType() != null ? e.getSeatingType() : "open");
        map.put("description",     e.getDescription() != null ? e.getDescription() : "");
        map.put("paymentMethod",   e.getPaymentMethod() != null ? e.getPaymentMethod() : "");
        map.put("accountName",      e.getAccountName() != null ? e.getAccountName() : "");
        map.put("accountNumber",   e.getAccountNumber() != null ? e.getAccountNumber() : "");
        map.put("virtualPlatform", e.getVirtualPlatform() != null ? e.getVirtualPlatform() : "");
        map.put("virtualLink",     e.getVirtualLink() != null ? e.getVirtualLink() : "");
        map.put("noRefundPolicy",  e.getNoRefundPolicy() != null ? e.getNoRefundPolicy() : false);
        map.put("isTrending",      e.getIsTrending());
        map.put("isDraft",         e.getIsDraft() != null ? e.getIsDraft() : false);
        map.put("eventStatus",     e.getEventStatus() != null ? e.getEventStatus() : "active");
        map.put("eventStatusReason", e.getEventStatusReason() != null ? e.getEventStatusReason() : "");
        map.put("hostId",          e.getHost().getId());
        map.put("hostFirstName",   e.getHost().getFirstname() != null ? e.getHost().getFirstname() : "");
        map.put("hostLastName",    e.getHost().getLastname() != null ? e.getHost().getLastname() : "");
        map.put("hostEmail",       e.getHost().getEmail() != null ? e.getHost().getEmail() : "");
        map.put("hostPhoto",       e.getHost().getPhoto() != null 
            ? "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(e.getHost().getPhoto()) 
            : null); // HashMap allows null values unlike Map.ofEntries
        return map;
    }

    private String formatAttendees(int count) {
        if (count >= 1000) {
            double k = count / 1000.0;
            String f = k == Math.floor(k) ? String.valueOf((int) k) : String.format("%.1f", k);
            return f + "K attending";
        }
        return count + " attending";
    }

    private void applyTimes(EventEntity event, Map<String, Object> body) {
        try {
            String startStr = (String) body.get("startTime");
            String endStr   = (String) body.get("endTime");
            event.setStartTime(startStr != null && !startStr.isBlank()
                ? LocalTime.parse(startStr) : LocalTime.of(0, 0));
            if (endStr != null && !endStr.isBlank())
                event.setEndTime(LocalTime.parse(endStr));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid time format");
        }
    }

    private void applyPriceAndCapacity(EventEntity event, Map<String, Object> body) {
        try {
            Object priceObj    = body.get("price");
            Object capacityObj = body.get("capacity");
            event.setPrice(priceObj != null ? Integer.parseInt(priceObj.toString()) : 0);
            event.setCapacity(capacityObj != null ? Integer.parseInt(capacityObj.toString()) : 100);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid price or capacity");
        }
    }

    private boolean isDraft(Map<String, Object> body) {
        Object v = body.get("isDraft");
        return v instanceof Boolean ? (Boolean) v : false;
    }

    private String getStr(Map<String, Object> body, String key, String fallback) {
        String val = (String) body.get(key);
        return val != null ? val : fallback;
    }

    private UserEntity findUserOrThrow(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private EventEntity findEventOrThrow(Long id) {
        return eventRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    /**
     * Recalculates attendance count for an event based on RSVP status.
     * For paid events, counts only confirmed RSVPs.
     * For free events, counts all registered RSVPs.
     */
    private void recalculateEventAttendance(EventEntity event) {
        long count = rsvpRepository.countConfirmedExcludingRejected(event, "confirmed");
        event.setAttendeeCount(Math.toIntExact(count));
    }
}