package com.hangout.app.event.service;

import com.hangout.app.event.model.EventEntity;
import com.hangout.app.event.repository.EventRepository;
import com.hangout.app.event.repository.RSVPRepository;
import com.hangout.app.user.model.UserEntity;
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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class EventService {

    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository  userRepository;
    @Autowired private RSVPRepository  rsvpRepository;

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
        event.setAccountNumber((String) body.get("accountNumber"));
        event.setVirtualPlatform((String) body.get("virtualPlatform"));
        event.setVirtualLink((String) body.get("virtualLink"));
        event.setImageUrl((String) body.get("imageUrl"));
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
        if (body.containsKey("accountNumber"))   event.setAccountNumber((String) body.get("accountNumber"));
        if (body.containsKey("virtualPlatform")) event.setVirtualPlatform((String) body.get("virtualPlatform"));
        if (body.containsKey("virtualLink"))     event.setVirtualLink((String) body.get("virtualLink"));
        if (body.containsKey("imageUrl"))        event.setImageUrl((String) body.get("imageUrl"));
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

        event.setUpdatedAt(LocalDateTime.now());
        return toResponse(eventRepository.save(event));
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public void deleteEvent(String email, Long id) {
        UserEntity  user  = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(id);

        if (!event.getHost().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");

        eventRepository.deleteById(id);
    }

    // ── Publish/Unpublish ─────────────────────────────────────────────────────

    public Map<String, Object> publishEvent(String email, Long id) {
        UserEntity  user  = findUserOrThrow(email);
        EventEntity event = findEventOrThrow(id);

        if (!event.getHost().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");

        event.setIsDraft(false);
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
        UserEntity user;
        try {
            user = findUserOrThrow(email); // auth check
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found or token invalid");
        }
        
        EventEntity event = findEventOrThrow(id);
        
        // Draft events: only owner can view
        boolean isDraft = event.getIsDraft() != null && event.getIsDraft();
        boolean isOwner = event.getHost().getId().equals(user.getId());
        
        if (isDraft && !isOwner) {
            System.out.println("[getEventDetails] Forbidden: User " + user.getId() + " (" + email + 
                ") tried to view draft event " + id + " owned by " + event.getHost().getId());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, 
                "You do not have permission to view this draft event");
        }
        
        System.out.println("[getEventDetails] User " + email + " accessing event " + id + 
            " (isDraft: " + isDraft + ", owner: " + isOwner + ")");
        
        // Recalculate attendance count to ensure accuracy (fixes any stale counts)
        recalculateEventAttendance(event);
        
        return toResponse(event);
    }

    public List<Map<String, Object>> getHostingEvents(String email) {
        UserEntity user = findUserOrThrow(email);
        return eventRepository
            .findByHostOrderByDateAscStartTimeAsc(user)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getTodayEvents(String email) {
        findUserOrThrow(email); // auth check
        return eventRepository
            .findByDateOrderByStartTimeAsc(LocalDate.now())
            .stream()
            .filter(e -> e.getIsDraft() == null || !e.getIsDraft()) // Only published events
            .map(this::toResponse).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getDiscoverEvents(String email, String search, String filter) {
        findUserOrThrow(email); // auth check
        LocalDate today    = LocalDate.now();
        LocalDate weekEnd  = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        LocalDate monthEnd = today.with(TemporalAdjusters.lastDayOfMonth());

        return eventRepository.findAll().stream()
            .filter(e -> e.getIsDraft() == null || !e.getIsDraft())
            .filter(e -> search.isEmpty()
                || e.getTitle().toLowerCase().contains(search.toLowerCase())
                || e.getLocation().toLowerCase().contains(search.toLowerCase()))
            .filter(e -> switch (filter) {
                case "free"       -> e.getPrice() == 0;
                case "paid"       -> e.getPrice() > 0;
                case "today"      -> e.getDate().isEqual(today);
                case "this_week"  -> !e.getDate().isBefore(today) && !e.getDate().isAfter(weekEnd);
                case "this_month" -> !e.getDate().isBefore(today) && !e.getDate().isAfter(monthEnd);
                default           -> true;
            })
            .sorted((a, b) -> {
                int d = a.getDate().compareTo(b.getDate());
                return d != 0 ? d : a.getStartTime().compareTo(b.getStartTime());
            })
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public Object[] locationSearch(String email, String q) {
        findUserOrThrow(email); // auth check
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

        return Map.ofEntries(
            Map.entry("id",              e.getId()),
            Map.entry("title",           e.getTitle()),
            Map.entry("imageUrl",        e.getImageUrl() != null ? e.getImageUrl() : ""),
            Map.entry("date",            e.getDate().format(DateTimeFormatter.ofPattern("MMM dd, yyyy"))),
            Map.entry("time",            timeLabel),
            Map.entry("startTime",       startTime),
            Map.entry("endTime",         endTime),
            Map.entry("location",        e.getLocation()),
            Map.entry("format",          e.getFormat()),
            Map.entry("eventType",       e.getEventType() != null ? e.getEventType() : "free"),
            Map.entry("price",           e.getPrice()),
            Map.entry("capacity",        e.getCapacity()),
            Map.entry("attendeeCount",   e.getAttendeeCount()),
            Map.entry("attendees",       formatAttendees(e.getAttendeeCount())),
            Map.entry("seatingType",     e.getSeatingType() != null ? e.getSeatingType() : "open"),
            Map.entry("description",     e.getDescription() != null ? e.getDescription() : ""),
            Map.entry("paymentMethod",   e.getPaymentMethod() != null ? e.getPaymentMethod() : ""),
            Map.entry("accountNumber",   e.getAccountNumber() != null ? e.getAccountNumber() : ""),
            Map.entry("virtualPlatform", e.getVirtualPlatform() != null ? e.getVirtualPlatform() : ""),
            Map.entry("virtualLink",     e.getVirtualLink() != null ? e.getVirtualLink() : ""),
            Map.entry("isTrending",      e.getIsTrending()),
            Map.entry("isDraft",         e.getIsDraft() != null ? e.getIsDraft() : false),
            Map.entry("hostId",          e.getHost().getId()),
            Map.entry("hostFirstName",   e.getHost().getFirstname() != null ? e.getHost().getFirstname() : ""),
            Map.entry("hostLastName",    e.getHost().getLastname() != null ? e.getHost().getLastname() : ""),
            Map.entry("hostEmail",       e.getHost().getEmail() != null ? e.getHost().getEmail() : "")
        );
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
        long count;
        if (event.getPrice() != null && event.getPrice() > 0) {
            // For paid events, only count confirmed RSVPs (payment approved)
            count = rsvpRepository.countByEventAndStatus(event, "confirmed");
        } else {
            // For free events, count all registered RSVPs
            count = rsvpRepository.countByEventAndStatus(event, "registered");
        }
        event.setAttendeeCount(Math.toIntExact(count));
        eventRepository.save(event);
    }
}