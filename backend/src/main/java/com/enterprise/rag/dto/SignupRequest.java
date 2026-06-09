package com.enterprise.rag.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SignupRequest {

    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    private String role;

    private String department;
}
