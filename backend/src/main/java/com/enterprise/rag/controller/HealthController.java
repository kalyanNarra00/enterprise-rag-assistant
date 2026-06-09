package com.enterprise.rag.controller;

import com.enterprise.rag.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Enterprise RAG Assistant API is operational");
        return ResponseEntity.ok(response);
    }
}
