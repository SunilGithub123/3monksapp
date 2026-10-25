package com.threemonks.dto;

import com.threemonks.enums.UnitType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class RawMaterialResponse {
    private Long id;
    private String name;
    private UnitType unitType;
    private BigDecimal costPerUnit;
    private String vendorName;
    private String vendorContact;
    private BigDecimal reorderLevel;
    private LocalDate lastPurchaseDate;
    private LocalDate expiryDate;
    private Boolean active;
}
