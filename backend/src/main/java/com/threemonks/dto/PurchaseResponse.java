package com.threemonks.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class PurchaseResponse {
    private Long id;
    private Long shopId;
    private String shopName;
    private Long rawMaterialId;
    private String rawMaterialName;
    private BigDecimal quantity;
    private BigDecimal totalCost;
    private BigDecimal gstPercentage;
    private BigDecimal gstAmount;
    private String vendorName;
    private String invoiceNumber;
    private LocalDate purchaseDate;
    private String purchasedByName;
}
