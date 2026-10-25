package com.threemonks.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RecipeRequest {
    @NotNull(message = "Please select a product")
    private Long productId;

    @NotNull(message = "Please select a raw material")
    private Long rawMaterialId;

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.01", message = "Quantity must be greater than 0")
    @DecimalMax(value = "99999.99", message = "Quantity cannot exceed 99,999.99")
    private BigDecimal quantityRequired;
}
