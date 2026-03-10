package com.hangout.app.controller;

import com.hangout.app.entity.EventEntity;
import com.hangout.app.entity.UserEntity;
import com.hangout.app.repository.EventRepository;
import com.hangout.app.repository.UserRepository;
import com.hangout.app.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/events")
public class EventController {

    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository  userRepository;
    @Autowired private JwtUtils        jwtUtils;

    private String extractEmail(String authHeader) {
        return jwtUtils.extractEmail(authHeader.replace("Bearer ", ""));
    }

    private Map<String, Object> toResponse(EventEntity e) {
        String startTime = e.getStartTime() != null
            ? e.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")) : "";
        String endTime = e.getEndTime() != null
            ? e.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm")) : "";
        String timeLabel = endTime.isEmpty() ? startTime : startTime + " \u2013 " + endTime;

        return Map.ofEntries(
            Map.entry("id",             e.getId()),
            Map.entry("title",          e.getTitle()),
            Map.entry("imageUrl",       e.getImageUrl() != null ? e.getImageUrl() : ""),
            Map.entry("date",           e.getDate().format(DateTimeFormatter.ofPattern("MMM dd, yyyy"))),
            Map.entry("time",           timeLabel),
            Map.entry("location",       e.getLocation()),
            Map.entry("format",         e.getFormat()),
            Map.entry("eventType",      e.getEventType() != null ? e.getEventType() : "free"),
            Map.entry("price",          e.getPrice()),
            Map.entry("capacity",       e.getCapacity()),
            Map.entry("attendeeCount",  e.getAttendeeCount()),
            Map.entry("attendees",      formatAttendees(e.getAttendeeCount())),
            Map.entry("seatingType",    e.getSeatingType() != null ? e.getSeatingType() : "open"),
            Map.entry("description",    e.getDescription() != null ? e.getDescription() : ""),
            Map.entry("paymentMethod",  e.getPaymentMethod() != null ? e.getPaymentMethod() : ""),
            Map.entry("accountNumber",  e.getAccountNumber() != null ? e.getAccountNumber() : ""),
            Map.entry("virtualPlatform",e.getVirtualPlatform() != null ? e.getVirtualPlatform() : ""),
            Map.entry("virtualLink",    e.getVirtualLink() != null ? e.getVirtualLink() : ""),
            Map.entry("isTrending",     e.getIsTrending()),
            Map.entry("isDraft",        e.getIsDraft() != null ? e.getIsDraft() : false)
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

    // ── POST /api/events — Create ─────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> createEvent(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> body) {

        String email = extractEmail(authHeader);
        Optional<UserEntity> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty())
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        String title    = (String) body.get("title");
        String dateStr  = (String) body.get("date");
        String location = (String) body.get("location");
        String format   = (String) body.get("format");

        if (title == null || title.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Title is required"));
        if (dateStr == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Date is required"));

        EventEntity event = new EventEntity();
        event.setHost(optUser.get());
        event.setTitle(title.trim());
        event.setLocation(location != null ? location.trim() : "");
        event.setFormat(format != null ? format : "In-Person");

        try {
            event.setDate(LocalDate.parse(dateStr));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid date format, expected YYYY-MM-DD"));
        }

        try {
            String startTimeStr = (String) body.get("startTime");
            String endTimeStr   = (String) body.get("endTime");
            event.setStartTime(startTimeStr != null && !startTimeStr.isBlank()
                ? LocalTime.parse(startTimeStr) : LocalTime.of(0, 0));
            if (endTimeStr != null && !endTimeStr.isBlank())
                event.setEndTime(LocalTime.parse(endTimeStr));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid time format"));
        }

        try {
            Object priceObj    = body.get("price");
            Object capacityObj = body.get("capacity");
            event.setPrice(priceObj != null ? Integer.parseInt(priceObj.toString()) : 0);
            event.setCapacity(capacityObj != null ? Integer.parseInt(capacityObj.toString()) : 100);
        } catch (NumberFormatException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid price or capacity"));
        }

        String eventType = (String) body.get("eventType");
        event.setEventType(eventType != null ? eventType : "free");
        event.setSeatingType((String) body.get("seatingType"));
        event.setDescription((String) body.get("description"));
        event.setPaymentMethod((String) body.get("paymentMethod"));
        event.setAccountNumber((String) body.get("accountNumber"));
        event.setVirtualPlatform((String) body.get("virtualPlatform"));
        event.setVirtualLink((String) body.get("virtualLink"));
        event.setImageUrl((String) body.get("imageUrl"));

        Object isDraftObj = body.get("isDraft");
        event.setIsDraft(isDraftObj instanceof Boolean ? (Boolean) isDraftObj : false);

        EventEntity saved = eventRepository.save(event);
        return ResponseEntity.status(201).body(toResponse(saved));
    }

    // ── PUT /api/events/{id} — Update ─────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        String email = extractEmail(authHeader);
        Optional<UserEntity> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty())
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Optional<EventEntity> optEvent = eventRepository.findById(id);
        if (optEvent.isEmpty())
            return ResponseEntity.status(404).body(Map.of("message", "Event not found"));

        EventEntity event = optEvent.get();
        if (!event.getHost().getId().equals(optUser.get().getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

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
        if (body.containsKey("isDraft")) {
            Object v = body.get("isDraft");
            event.setIsDraft(v instanceof Boolean ? (Boolean) v : false);
        }

        try {
            String dateStr = (String) body.get("date");
            if (dateStr != null) event.setDate(LocalDate.parse(dateStr));

            String startTimeStr = (String) body.get("startTime");
            if (startTimeStr != null && !startTimeStr.isBlank())
                event.setStartTime(LocalTime.parse(startTimeStr));

            String endTimeStr = (String) body.get("endTime");
            if (endTimeStr != null && !endTimeStr.isBlank())
                event.setEndTime(LocalTime.parse(endTimeStr));
            else if (body.containsKey("endTime"))
                event.setEndTime(null);

            Object priceObj    = body.get("price");
            Object capacityObj = body.get("capacity");
            if (priceObj    != null) event.setPrice(Integer.parseInt(priceObj.toString()));
            if (capacityObj != null) event.setCapacity(Integer.parseInt(capacityObj.toString()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid date, time, price, or capacity"));
        }

        event.setUpdatedAt(LocalDateTime.now());
        EventEntity saved = eventRepository.save(event);
        return ResponseEntity.ok(toResponse(saved));
    }

    // ── DELETE /api/events/{id} ───────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        String email = extractEmail(authHeader);
        Optional<UserEntity> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty())
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Optional<EventEntity> optEvent = eventRepository.findById(id);
        if (optEvent.isEmpty())
            return ResponseEntity.status(404).body(Map.of("message", "Event not found"));

        if (!optEvent.get().getHost().getId().equals(optUser.get().getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        eventRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Event deleted"));
    }

    // ── GET /api/events/hosting ───────────────────────────────────────────────
    @GetMapping("/hosting")
    public ResponseEntity<?> getHostingEvents(@RequestHeader("Authorization") String authHeader) {
        String email = extractEmail(authHeader);
        Optional<UserEntity> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty())
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        List<Map<String, Object>> events = eventRepository
            .findByHostOrderByDateAscStartTimeAsc(optUser.get())
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());

        return ResponseEntity.ok(events);
    }

    // ── GET /api/events/today ─────────────────────────────────────────────────
    @GetMapping("/today")
    public ResponseEntity<?> getTodayEvents(@RequestHeader("Authorization") String authHeader) {
        String email = extractEmail(authHeader);
        if (userRepository.findByEmail(email).isEmpty())
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        List<Map<String, Object>> events = eventRepository
            .findByDateOrderByStartTimeAsc(LocalDate.now())
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());

        return ResponseEntity.ok(events);
    }

    // ── GET /api/events/discover ──────────────────────────────────────────────
    @GetMapping("/discover")
    public ResponseEntity<?> getDiscoverEvents(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "all") String filter) {

        String email = extractEmail(authHeader);
        if (userRepository.findByEmail(email).isEmpty())
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        LocalDate today    = LocalDate.now();
        LocalDate weekEnd  = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        LocalDate monthEnd = today.with(TemporalAdjusters.lastDayOfMonth());

        List<Map<String, Object>> events = eventRepository.findAll()
            .stream()
            // exclude drafts from discover
            .filter(e -> e.getIsDraft() == null || !e.getIsDraft())
            .filter(e -> search.isEmpty() ||
                e.getTitle().toLowerCase().contains(search.toLowerCase()) ||
                e.getLocation().toLowerCase().contains(search.toLowerCase()))
            .filter(e -> switch (filter) {
                case "free"       -> e.getPrice() == 0;
                case "paid"       -> e.getPrice() > 0;
                case "today"      -> e.getDate().isEqual(today);
                case "this_week"  -> !e.getDate().isBefore(today) && !e.getDate().isAfter(weekEnd);
                case "this_month" -> !e.getDate().isBefore(today) && !e.getDate().isAfter(monthEnd);
                default           -> true;
            })
            .sorted((a, b) -> {
                int dateCmp = a.getDate().compareTo(b.getDate());
                return dateCmp != 0 ? dateCmp : a.getStartTime().compareTo(b.getStartTime());
            })
            .map(this::toResponse)
            .collect(Collectors.toList());

        return ResponseEntity.ok(events);
    }

    // ── GET /api/events/location/search — Nominatim proxy ────────────────────
    @GetMapping("/location/search")
    public ResponseEntity<?> locationSearch(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam String q) {

        String email = extractEmail(authHeader);
        if (userRepository.findByEmail(email).isEmpty())
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        try {
            String url = "https://nominatim.openstreetmap.org/search"
                + "?q=" + java.net.URLEncoder.encode(q, "UTF-8")
                + "&format=json&addressdetails=1&limit=6&countrycodes=ph";

            RestTemplate rt = new RestTemplate();
            rt.getInterceptors().add((request, body2, execution) -> {
                request.getHeaders().set("User-Agent", "HangOutApp/1.0");
                return execution.execute(request, body2);
            });

            Object[] results = rt.getForObject(url, Object[].class);
            return ResponseEntity.ok(results != null ? results : new Object[0]);
        } catch (Exception ex) {
            return ResponseEntity.ok(new Object[0]);
        }
    }
}