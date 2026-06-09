package com.enterprise.rag.service;

import com.enterprise.rag.dto.LoginRequest;
import com.enterprise.rag.dto.SignupRequest;
import com.enterprise.rag.model.AuditLog;
import com.enterprise.rag.model.User;
import com.enterprise.rag.repository.AuditLogRepository;
import com.enterprise.rag.repository.UserRepository;
import com.enterprise.rag.security.JwtTokenProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditLogRepository auditLogRepository;

    public AuthService(UserRepository userRepository,
                       BCryptPasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider,
                       AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.auditLogRepository = auditLogRepository;
    }

    public Map<String, Object> signup(SignupRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + req.getEmail());
        }

        User user = User.builder()
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .role(req.getRole() != null ? req.getRole() : "employee")
                .department(req.getDepartment())
                .status("active")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        User savedUser = userRepository.save(user);

        String token = jwtTokenProvider.generateToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", formatUser(savedUser));
        return result;
    }

    public Map<String, Object> login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        if (!"active".equalsIgnoreCase(user.getStatus())) {
            throw new IllegalStateException("Account is not active. Current status: " + user.getStatus());
        }

        AuditLog auditLog = AuditLog.builder()
                .userId(user.getId())
                .userEmail(user.getEmail())
                .action("login")
                .timestamp(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", formatUser(user));
        return result;
    }

    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));
    }

    public Map<String, Object> formatUser(User u) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", u.getId());
        userMap.put("email", u.getEmail());
        userMap.put("firstName", u.getFirstName());
        userMap.put("lastName", u.getLastName());
        userMap.put("role", u.getRole());
        userMap.put("department", u.getDepartment());
        userMap.put("status", u.getStatus());
        return userMap;
    }
}
