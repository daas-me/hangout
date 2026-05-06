package com.hangout.app.shared.config;

import com.hangout.app.shared.utils.JwtUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;


import java.io.IOException;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtils jwtUtils;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String method = request.getMethod();
        String path = request.getRequestURI();
        
        
        System.out.println("[JwtFilter] " + method + " " + path + " - Auth header: " + 
            (authHeader != null ? (authHeader.startsWith("Bearer ") ? "Bearer [token]" : authHeader) : "MISSING"));

        // Allow CORS preflight requests without authentication
        if ("OPTIONS".equalsIgnoreCase(method)) {
            System.out.println("[JwtFilter] OPTIONS preflight request - skipping authentication");
            filterChain.doFilter(request, response);
            return;
        }

        // ─ Public endpoints (no auth required) ─────────────────────────────────
        if (isPublicEndpoint(path, method)) {
             if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtils.validateToken(token)) {
                    String email = jwtUtils.extractEmail(token);
                    UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(email, null, List.of());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
            filterChain.doFilter(request, response);
            return;
        }

        // ─ Protected endpoints (auth required) ────────────────────────────────
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtils.validateToken(token)) {
                String email = jwtUtils.extractEmail(token);
                System.out.println("[JwtFilter] ✓ Authenticated user: " + email);
                UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(email, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(auth);
                filterChain.doFilter(request, response);
            } else {
                // Token is invalid/expired - return 401 immediately
                System.out.println("[JwtFilter] ✗ Invalid or expired token - returning 401");
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Token is invalid or expired. Please log in again.\"}");
            }
        } else {
            // No Bearer token - return 401 immediately
            System.out.println("[JwtFilter] ✗ No Bearer token - returning 401");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Authentication required. Please provide a valid Bearer token.\"}");
        }
    }

    private boolean isPublicEndpoint(String path, String method) {
    return path.matches("^/api/auth/.*") ||
           path.matches("^/api/uploads/.*") ||
           path.matches("^/api/events/uploads/.*") ||
           path.matches("^/api/events/rsvp/uploads/.*") ||
           ("GET".equals(method) && path.matches("^/api/events/[0-9]+$")) ||
           ("GET".equals(method) && path.matches("^/api/events/discover.*")) ||
           ("GET".equals(method) && path.matches("^/api/events/location/search.*"));
}
}