package com.enterprise.rag.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "auditlogs")
public class AuditLog {

    @Id
    private String id;

    private String userId;

    private String userEmail;

    private String action;

    private String query;

    private List<String> resourcesAccessed;

    private String ipAddress;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    private Double responseConfidence;
}
