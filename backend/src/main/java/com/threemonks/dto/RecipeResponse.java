package com.threemonks.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class RecipeResponse {
    private Long id;
    private Long productId;
    private String productName;
    private Long rawMaterialId;
    private String rawMaterialName;
    private String unitType;
    private BigDecimal quantityRequired;
}
