package com.enterprise.rag.service;

import com.enterprise.rag.model.AuditLog;
import com.enterprise.rag.model.User;
import com.enterprise.rag.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class QueryService {

    private final RbacService rbacService;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    public QueryService(RbacService rbacService,
                        AuditLogRepository auditLogRepository,
                        ObjectMapper objectMapper) {
        this.rbacService = rbacService;
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> submitQuery(String queryText, User user, String ipAddress) {
        Map<String, Object> accessFilter = rbacService.buildAccessFilter(user);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("query", queryText);
        payload.put("metadata_filter", accessFilter.isEmpty() ? null : accessFilter);
        payload.put("user_role", user.getRole());
        payload.put("user_department", user.getDepartment());

        try {
            String jsonBody = objectMapper.writeValueAsString(payload);
            String responseJson = httpPost(aiServiceUrl + "/api/query", jsonBody);
            Map<String, Object> responseBody = objectMapper.readValue(responseJson, Map.class);

            List<String> sourceNames = new ArrayList<>();
            Double confidence = null;
            if (responseBody != null) {
                Object sourcesObj = responseBody.get("sources");
                if (sourcesObj instanceof List<?> sourceList) {
                    for (Object s : sourceList) {
                        if (s instanceof Map<?, ?> sourceMap) {
                            Object src = sourceMap.get("source");
                            sourceNames.add(src != null ? String.valueOf(src) : "unknown");
                        } else {
                            sourceNames.add(String.valueOf(s));
                        }
                    }
                }
                Object confObj = responseBody.get("confidence");
                if (confObj instanceof Number num) {
                    confidence = num.doubleValue();
                }
            }

            auditLogRepository.save(AuditLog.builder()
                    .userId(user.getId())
                    .userEmail(user.getEmail())
                    .action("query")
                    .query(queryText)
                    .resourcesAccessed(sourceNames)
                    .ipAddress(ipAddress)
                    .responseConfidence(confidence)
                    .timestamp(LocalDateTime.now())
                    .build());

            return responseBody;
        } catch (Exception ex) {
            throw new RuntimeException("Query failed: " + ex.getMessage());
        }
    }

    public List<AuditLog> getQueryHistory(String userId) {
        return auditLogRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    private String httpPost(String urlStr, String jsonBody) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) URI.create(urlStr).toURL().openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setRequestProperty("Accept", "application/json");
        conn.setDoOutput(true);
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(30000);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonBody.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            os.flush();
        }

        int status = conn.getResponseCode();
        InputStream stream = (status >= 200 && status < 300) ? conn.getInputStream() : conn.getErrorStream();

        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(stream, java.nio.charset.StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
        }

        if (status >= 400) {
            throw new IOException("AI service returned " + status + ": " + sb);
        }

        return sb.toString();
    }
}
