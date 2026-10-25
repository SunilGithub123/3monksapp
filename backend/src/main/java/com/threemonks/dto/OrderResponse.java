package com.threemonks.dto;

import com.threemonks.enums.OrderStatus;
import com.threemonks.enums.PaymentMode;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponse {
    private Long id;
    private String orderNumber;
    private Long shopId;
    private String shopName;
    private String createdByName;
    private List<OrderItemResponse> items;
    private BigDecimal totalAmount;
    private PaymentMode paymentMode;
    private OrderStatus status;
    private String customerName;
    private String customerPhone;
    private LocalDateTime orderDate;
    private Integer tokenNumber;
}
