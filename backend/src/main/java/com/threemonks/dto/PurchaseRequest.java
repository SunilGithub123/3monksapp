package com.threemonks.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PurchaseRequest {
    @NotNull(message = "Shop ID is required")
    private Long shopId;

    @NotNull(message = "Raw material ID is required")
    private Long rawMaterialId;

    @NotNull(message = "Quantity is required")
    private BigDecimal quantity;

    @NotNull(message = "Total cost is required")
    private BigDecimal totalCost;

    private BigDecimal gstPercentage;
    private BigDecimal gstAmount;

    private String vendorName;
    private String invoiceNumber;
    private LocalDate purchaseDate;
}
