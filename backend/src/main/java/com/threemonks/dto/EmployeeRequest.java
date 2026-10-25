package com.threemonks.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class EmployeeRequest {
    @NotNull(message = "Please select a user")
    private Long userId;

    @NotNull(message = "Please select a shop")
    private Long shopId;

    @NotNull(message = "Salary is required")
    @DecimalMin(value = "1.00", message = "Salary must be at least ₹1")
    @DecimalMax(value = "9999999.99", message = "Salary cannot exceed ₹99,99,999.99")
    private BigDecimal salary;

    @DecimalMin(value = "0.00", message = "Incentive percentage cannot be negative")
    @DecimalMax(value = "100.00", message = "Incentive percentage cannot exceed 100%")
    private BigDecimal incentivePercentage;
}
