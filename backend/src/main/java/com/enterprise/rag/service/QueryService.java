package com.enterprise.rag.service;

import com.enterprise.rag.model.AuditLog;
import com.enterprise.rag.model.User;
import com.enterprise.rag.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class QueryService {

    private final RbacService rbacService;
    private final RestTemplate restTemplate;
    private final AuditLogRepository auditLogRepository;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    public QueryService(RbacService rbacService,
                        RestTemplate restTemplate,
                        AuditLogRepository auditLogRepository) {
        this.rbacService = rbacService;
        this.restTemplate = restTemplate;
        this.auditLogRepository = auditLogRepository;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> submitQuery(String queryText, User user, String ipAddress) {
        Map<String, Object> accessFilter = rbacService.buildAccessFilter(user);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("query", queryText);
        requestBody.put("metadata_filter", accessFilter);
        requestBody.put("user_role", user.getRole());
        requestBody.put("user_department", user.getDepartment());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(
                aiServiceUrl + "/api/query",
                HttpMethod.POST,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
        );

        Map<String, Object> responseBody = responseEntity.getBody();

        List<String> sources = null;
        Double confidence = null;
        if (responseBody != null) {
            Object sourcesObj = responseBody.get("sources");
            if (sourcesObj instanceof List<?>) {
                sources = ((List<?>) sourcesObj).stream()
                        .map(Object::toString)
                        .toList();
            }
            Object confidenceObj = responseBody.get("confidence");
            if (confidenceObj instanceof Number) {
                confidence = ((Number) confidenceObj).doubleValue();
            }
        }

        AuditLog auditLog = AuditLog.builder()
                .userId(user.getId())
                .userEmail(user.getEmail())
                .action("query")
                .query(queryText)
                .resourcesAccessed(sources)
                .ipAddress(ipAddress)
                .responseConfidence(confidence)
                .timestamp(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);

        return responseBody;
    }

    public List<AuditLog> getQueryHistory(String userId) {
        return auditLogRepository.findByUserIdOrderByTimestampDesc(userId);
    }
}
