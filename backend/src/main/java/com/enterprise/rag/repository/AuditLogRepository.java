package com.enterprise.rag.repository;

import com.enterprise.rag.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    List<AuditLog> findByUserIdOrderByTimestampDesc(String userId);

    List<AuditLog> findByActionOrderByTimestampDesc(String action);

    long countByAction(String action);

    List<AuditLog> findAllByOrderByTimestampDesc();
}
