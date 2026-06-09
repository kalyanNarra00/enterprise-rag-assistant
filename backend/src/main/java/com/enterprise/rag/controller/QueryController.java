package com.enterprise.rag.controller;

import com.enterprise.rag.dto.ApiResponse;
import com.enterprise.rag.dto.QueryRequest;
import com.enterprise.rag.model.AuditLog;
import com.enterprise.rag.model.User;
import com.enterprise.rag.service.QueryService;
import jakarta.servlet.http.HttpServletRequest;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/query")
public class QueryController {

    private final QueryService queryService;

    public QueryController(QueryService queryService) {
        this.queryService = queryService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitQuery(
            @RequestBody @Valid QueryRequest request,
            HttpServletRequest httpRequest) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Not authenticated"));
            }
            User user = (User) authentication.getPrincipal();
            String ipAddress = httpRequest.getRemoteAddr();

            Map<String, Object> result = queryService.submitQuery(request.getQuery(), user, ipAddress);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Query failed: " + e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getQueryHistory() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Not authenticated"));
            }
            User user = (User) authentication.getPrincipal();

            List<AuditLog> history = queryService.getQueryHistory(user.getId());
            return ResponseEntity.ok(ApiResponse.success(history));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve query history: " + e.getMessage()));
        }
    }
}
