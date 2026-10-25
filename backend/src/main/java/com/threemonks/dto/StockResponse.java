package com.threemonks.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class StockResponse {
    private Long id;
    private Long shopId;
    private String shopName;
    private Long rawMaterialId;
    private String rawMaterialName;
    private String unitType;
    private BigDecimal openingStock;
    private BigDecimal quantity;
    private BigDecimal minimumThreshold;
    private Boolean lowStock;
}
