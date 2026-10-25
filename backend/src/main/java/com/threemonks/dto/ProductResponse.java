package com.threemonks.dto;

import com.threemonks.enums.ProductCategory;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class ProductResponse {
    private Long id;
    private String name;
    private String description;
    private String imageUrl;
    private Boolean hasImage;
    private ProductCategory category;
    private BigDecimal price;
    private List<FruitResponse> fruits;
    private Boolean active;
}
