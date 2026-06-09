package com.enterprise.rag.controller;

import com.enterprise.rag.dto.ApiResponse;
import com.enterprise.rag.model.AuditLog;
import com.enterprise.rag.model.User;
import com.enterprise.rag.service.AdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/ingest")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerIngestion() {
        try {
            Map<String, Object> result = adminService.triggerIngestion();
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Ingestion failed: " + e.getMessage()));
        }
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs() {
        try {
            List<AuditLog> logs = adminService.getAuditLogs();
            return ResponseEntity.ok(ApiResponse.success(logs));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve audit logs: " + e.getMessage()));
        }
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemStats() {
        try {
            Map<String, Object> stats = adminService.getSystemStats();
            return ResponseEntity.ok(ApiResponse.success(stats));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve system stats: " + e.getMessage()));
        }
    }
}
