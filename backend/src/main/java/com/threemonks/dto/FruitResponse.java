package com.threemonks.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FruitResponse {
    private Long id;
    private String name;
    private String imageUrl;
    private Integer shortCode;
    private Boolean active;
    private Boolean eligibleForShot;
    private Boolean eligibleForBlend;
}
