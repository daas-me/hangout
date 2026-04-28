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

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtils.validateToken(token)) {
                String email = jwtUtils.extractEmail(token);
                System.out.println("[JwtFilter] Authenticated user: " + email);
                UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(email, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } else {
                System.out.println("[JwtFilter] Invalid token");
            }
        } else {
            System.out.println("[JwtFilter] No Bearer token in Authorization header");
        }

        filterChain.doFilter(request, response);
    }
}