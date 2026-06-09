package com.enterprise.rag.controller;

import com.enterprise.rag.dto.ApiResponse;
import com.enterprise.rag.dto.LoginRequest;
import com.enterprise.rag.dto.SignupRequest;
import com.enterprise.rag.model.User;
import com.enterprise.rag.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Map<String, Object>>> signup(@RequestBody @Valid SignupRequest request) {
        try {
            Map<String, Object> result = authService.signup(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Signup failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@RequestBody @Valid LoginRequest request) {
        try {
            Map<String, Object> result = authService.login(request);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Login failed: " + e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Not authenticated"));
            }
            User user = (User) authentication.getPrincipal();
            Map<String, Object> userData = authService.formatUser(user);
            return ResponseEntity.ok(ApiResponse.success(userData));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to get user info: " + e.getMessage()));
        }
    }
}
