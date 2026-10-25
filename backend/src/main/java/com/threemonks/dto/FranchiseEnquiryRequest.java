package com.threemonks.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class FranchiseEnquiryRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone is required")
    private String phone;

    @NotBlank(message = "City is required")
    private String city;

    @Size(max = 1500, message = "Message must be under 1500 characters")
    private String message;
}
