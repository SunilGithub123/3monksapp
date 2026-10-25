package com.threemonks.dto;

import com.threemonks.enums.UnitType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class RawMaterialRequest {
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotNull(message = "Unit type is required")
    private UnitType unitType;

    @NotNull(message = "Cost per unit is required")
    @DecimalMin(value = "0.01", message = "Cost per unit must be at least ₹0.01")
    @DecimalMax(value = "999999.99", message = "Cost per unit cannot exceed ₹9,99,999.99")
    private BigDecimal costPerUnit;

    @Size(max = 100, message = "Vendor name cannot exceed 100 characters")
    private String vendorName;

    @Pattern(regexp = "^$|^[0-9]{10}$", message = "Vendor contact must be exactly 10 digits")
    private String vendorContact;

    @DecimalMin(value = "0.01", message = "Reorder level must be greater than 0")
    private BigDecimal reorderLevel;

    private LocalDate expiryDate;
}
