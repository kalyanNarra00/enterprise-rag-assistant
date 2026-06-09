package com.enterprise.rag.service;

import com.enterprise.rag.model.AuditLog;
import com.enterprise.rag.model.User;
import com.enterprise.rag.repository.AuditLogRepository;
import com.enterprise.rag.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    public AdminService(AuditLogRepository auditLogRepository,
                        UserRepository userRepository,
                        RestTemplate restTemplate) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.restTemplate = restTemplate;
    }

    public Map<String, Object> triggerIngestion() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(
                aiServiceUrl + "/api/ingest",
                HttpMethod.POST,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
        );

        return responseEntity.getBody();
    }

    public List<AuditLog> getAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getSystemStats() {
        Map<String, Object> stats = new HashMap<>();

        // Documents stats from AI service
        Map<String, Object> documentsStats = new HashMap<>();
        try {
            ResponseEntity<Map<String, Object>> aiStatsResponse = restTemplate.exchange(
                    aiServiceUrl + "/api/stats",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            Map<String, Object> aiStats = aiStatsResponse.getBody();
            if (aiStats != null && aiStats.containsKey("document_count")) {
                documentsStats.put("total", aiStats.get("document_count"));
            } else {
                documentsStats.put("total", 0);
            }
        } catch (Exception e) {
            documentsStats.put("total", 0);
            documentsStats.put("error", "AI service unavailable");
        }
        stats.put("documents", documentsStats);

        // Users stats
        Map<String, Object> usersStats = new HashMap<>();
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus("active");
        usersStats.put("total", totalUsers);
        usersStats.put("active", activeUsers);

        List<User> allUsers = userRepository.findAll();
        Map<String, Long> byRole = allUsers.stream()
                .collect(Collectors.groupingBy(
                        user -> user.getRole() != null ? user.getRole() : "unknown",
                        Collectors.counting()
                ));
        usersStats.put("byRole", byRole);
        stats.put("users", usersStats);

        // Queries stats
        Map<String, Object> queriesStats = new HashMap<>();
        long totalQueries = auditLogRepository.countByAction("query");
        queriesStats.put("total", totalQueries);
        stats.put("queries", queriesStats);

        // Confidence stats
        Map<String, Object> confidenceStats = new HashMap<>();
        List<AuditLog> queryLogs = auditLogRepository.findByActionOrderByTimestampDesc("query");
        double averageConfidence = queryLogs.stream()
                .filter(log -> log.getResponseConfidence() != null)
                .mapToDouble(AuditLog::getResponseConfidence)
                .average()
                .orElse(0.0);
        confidenceStats.put("average", Math.round(averageConfidence * 100.0) / 100.0);
        stats.put("confidence", confidenceStats);

        return stats;
    }
}
