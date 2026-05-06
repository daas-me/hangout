package com.hangout.app.shared.utils;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;

@Component
public class JwtUtils {

    private final Key key = Keys.hmacShaKeyFor(
    "hangout-secret-key-must-be-at-least-32-chars-long".getBytes(java.nio.charset.StandardCharsets.UTF_8)
);
    private final long EXPIRATION = 604800000; // 7 days (extended from 24 hours to prevent frequent logouts)

    public String generateToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION))
                .signWith(key)
                .compact();
    }

    public String extractEmail(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException e) {
            System.err.println("[JwtUtils] Token expired: " + e.getMessage());
            return false;
        } catch (SignatureException e) {
            System.err.println("[JwtUtils] Invalid token signature: " + e.getMessage());
            return false;
        } catch (MalformedJwtException e) {
            System.err.println("[JwtUtils] Malformed token: " + e.getMessage());
            return false;
        } catch (JwtException e) {
            System.err.println("[JwtUtils] JWT validation failed: " + e.getMessage());
            return false;
        }
    }
}