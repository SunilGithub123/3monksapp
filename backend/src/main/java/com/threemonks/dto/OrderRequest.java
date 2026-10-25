package com.threemonks.dto;

import com.threemonks.enums.PaymentMode;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class OrderRequest {
    private Long shopId;

    @NotNull(message = "Items are required")
    private List<OrderItemRequest> items;

    @NotNull(message = "Payment mode is required")
    private PaymentMode paymentMode;

    private String customerName;
    private String customerPhone;
}
