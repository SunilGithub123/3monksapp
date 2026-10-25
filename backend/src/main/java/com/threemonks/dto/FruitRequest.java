package com.threemonks.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FruitRequest {
    @NotBlank(message = "Fruit name is required")
    private String name;
    private String imageUrl;
    private Boolean eligibleForShot = true;
    private Boolean eligibleForBlend = true;
}
