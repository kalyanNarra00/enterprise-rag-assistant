package com.enterprise.rag.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;

    private String firstName;

    private String lastName;

    @Builder.Default
    private String role = "employee";

    private String department;

    @Builder.Default
    private String status = "active";

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
