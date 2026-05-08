package com.hangout.app.message.service;

import com.hangout.app.message.entity.MessageEntity;
import com.hangout.app.message.repository.MessageRepository;
import com.hangout.app.user.entity.UserEntity;
import com.hangout.app.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MessageService {

    @Autowired private MessageRepository messageRepository;
    @Autowired private UserRepository userRepository;

    private UserEntity findUserOrThrow(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "User not found"));
    }

    private UserEntity findUserByIdOrThrow(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "User not found"));
    }

    private Map<String, Object> toUserSnippet(UserEntity u) {
        Map<String, Object> map = new HashMap<>();
        map.put("id",        u.getId());
        map.put("firstname", u.getFirstname());
        map.put("lastname",  u.getLastname());
        map.put("email",     u.getEmail());
        map.put("photo",     u.getPhoto() != null
            ? "data:image/jpeg;base64,"
                + Base64.getEncoder().encodeToString(u.getPhoto())
            : null);
        return map;
    }

    private Map<String, Object> toMessageResponse(MessageEntity m) {
        Map<String, Object> map = new HashMap<>();
        map.put("id",          m.getId());
        map.put("senderId",    m.getSender().getId());
        map.put("recipientId", m.getRecipient().getId());
        map.put("content",     m.getContent());
        map.put("isRead",      m.getIsRead());
        map.put("sentAt",      m.getSentAt().toString());
        return map;
    }

    // ── Send Message ──────────────────────────────────────────────────────────

    public Map<String, Object> sendMessage(String senderEmail,
                                            Long recipientId,
                                            String content) {
        if (content == null || content.isBlank())
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Message content cannot be empty");
        if (content.length() > 2000)
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Message too long (max 2000 characters)");

        UserEntity sender    = findUserOrThrow(senderEmail);
        UserEntity recipient = findUserByIdOrThrow(recipientId);

        if (sender.getId().equals(recipient.getId()))
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Cannot message yourself");

        MessageEntity msg = new MessageEntity();
        msg.setSender(sender);
        msg.setRecipient(recipient);
        msg.setContent(content.trim());
        messageRepository.save(msg);

        return toMessageResponse(msg);
    }

    // ── Get Conversation ──────────────────────────────────────────────────────

    public Map<String, Object> getConversation(String currentEmail, Long otherUserId) {
        UserEntity current = findUserOrThrow(currentEmail);
        UserEntity other   = findUserByIdOrThrow(otherUserId);

        messageRepository.markAsRead(other, current);

        List<Map<String, Object>> messages = messageRepository
            .findConversation(current, other)
            .stream()
            .map(this::toMessageResponse)
            .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("messages",  messages);
        response.put("otherUser", toUserSnippet(other));
        return response;
    }

    // ── Get Conversations List (Inbox) ────────────────────────────────────────
    // Groups in Java to avoid the problematic JPQL subquery with MAX/GROUP BY

    public List<Map<String, Object>> getConversations(String currentEmail) {
        UserEntity current = findUserOrThrow(currentEmail);

        List<MessageEntity> allMessages =
            messageRepository.findAllInvolvingUser(current);

        // Group by the "other" user ID, keeping only the latest message per group
        // (list is already sorted DESC so first entry per group = latest)
        Map<Long, MessageEntity> latestPerPartner = new LinkedHashMap<>();
        for (MessageEntity m : allMessages) {
            UserEntity other = m.getSender().getId().equals(current.getId())
                ? m.getRecipient()
                : m.getSender();
            latestPerPartner.putIfAbsent(other.getId(), m);
        }

        return latestPerPartner.entrySet().stream().map(entry -> {
            MessageEntity latest = entry.getValue();
            UserEntity other = latest.getSender().getId().equals(current.getId())
                ? latest.getRecipient()
                : latest.getSender();

            long unread = messageRepository
                .countBySenderAndRecipientAndIsRead(other, current, false);

            Map<String, Object> conv = new HashMap<>();
            conv.put("otherUser",   toUserSnippet(other));
            conv.put("lastMessage", toMessageResponse(latest));
            conv.put("unreadCount", unread);
            return conv;
        }).collect(Collectors.toList());
    }

    // ── Unread Count ──────────────────────────────────────────────────────────

    public Map<String, Object> getUnreadCount(String email) {
        UserEntity user = findUserOrThrow(email);
        long count = messageRepository.countUnreadForUser(user);
        return Map.of("unreadCount", count);
    }
}