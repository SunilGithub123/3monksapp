package com.threemonks.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class ProfitLossResponse {
    private LocalDate fromDate;
    private LocalDate toDate;
    private Long shopId;
    private String shopName;
    private BigDecimal totalRevenue;
    private BigDecimal totalCost;
    private BigDecimal profit;
    private Long totalOrders;
}
