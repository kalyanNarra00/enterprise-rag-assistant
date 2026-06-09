package com.enterprise.rag.service;

import com.enterprise.rag.model.User;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RbacService {

    public Map<String, Object> buildAccessFilter(User user) {
        Map<String, Object> filter = new HashMap<>();
        String role = user.getRole();

        if ("admin".equalsIgnoreCase(role)) {
            filter.put("access_level", List.of("public", "internal", "confidential", "restricted"));
        } else if ("manager".equalsIgnoreCase(role)) {
            filter.put("access_level", List.of("public", "internal", "confidential"));
            filter.put("department", user.getDepartment());
        } else {
            filter.put("access_level", List.of("public", "internal"));
            filter.put("department", user.getDepartment());
        }

        return filter;
    }
}
