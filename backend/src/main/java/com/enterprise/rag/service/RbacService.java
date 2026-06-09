package com.enterprise.rag.service;

import com.enterprise.rag.model.User;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RbacService {

    public Map<String, Object> buildAccessFilter(User user) {
        if (user == null || user.getRole() == null) {
            return Map.of("access_level", List.of("employee"));
        }

        return switch (user.getRole().toLowerCase()) {
            case "admin" -> new HashMap<>();
            case "hr" -> Map.of(
                    "department", List.of("HR"),
                    "access_level", List.of("employee", "hr")
            );
            case "finance" -> Map.of(
                    "department", List.of("Finance"),
                    "access_level", List.of("employee", "finance")
            );
            case "it_admin" -> Map.of(
                    "department", List.of("IT"),
                    "access_level", List.of("employee", "it_admin")
            );
            case "manager" -> Map.of(
                    "access_level", List.of("employee", "manager"),
                    "department", List.of(user.getDepartment() != null ? user.getDepartment() : "General")
            );
            default -> Map.of("access_level", List.of("employee"));
        };
    }

    public boolean isAdmin(User user) {
        return user != null && "admin".equalsIgnoreCase(user.getRole());
    }

    public boolean hasRole(User user, String... roles) {
        if (user == null || user.getRole() == null) return false;
        for (String role : roles) {
            if (role.equalsIgnoreCase(user.getRole())) return true;
        }
        return false;
    }
}
