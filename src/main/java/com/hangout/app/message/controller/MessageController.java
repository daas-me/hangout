package com.hangout.app.message.controller;

import com.hangout.app.message.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired private MessageService messageService;

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated())
            throw new RuntimeException("Not authenticated");
        return auth.getName();
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> body) {
        Long recipientId = Long.valueOf(body.get("recipientId").toString());
        String content   = (String) body.get("content");
        return ResponseEntity.ok(messageService.sendMessage(currentEmail(), recipientId, content));
    }

    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations() {
        return ResponseEntity.ok(messageService.getConversations(currentEmail()));
    }

    @GetMapping("/conversation/{userId}")
    public ResponseEntity<?> getConversation(@PathVariable Long userId) {
        return ResponseEntity.ok(messageService.getConversation(currentEmail(), userId));
    }

    @GetMapping("/unread/count")
    public ResponseEntity<?> getUnreadCount() {
        return ResponseEntity.ok(messageService.getUnreadCount(currentEmail()));
    }
}
