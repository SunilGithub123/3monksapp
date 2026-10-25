package com.threemonks.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class DashboardResponse {
    private BigDecimal totalSales;
    private Long totalOrders;
    private BigDecimal totalRevenue;
    private BigDecimal totalCost;
    private BigDecimal totalProfit;
    private List<TopProductDTO> topProducts;
    private List<SalesPerShopDTO> salesPerShop;
    private List<LowStockAlertDTO> lowStockAlerts;
    private Map<String, BigDecimal> monthlySales;

    @Data
    @Builder
    public static class TopProductDTO {
        private String productName;
        private Long totalQuantity;
        private BigDecimal totalRevenue;
    }

    @Data
    @Builder
    public static class SalesPerShopDTO {
        private Long shopId;
        private String shopName;
        private BigDecimal totalSales;
        private Long orderCount;
    }

    @Data
    @Builder
    public static class LowStockAlertDTO {
        private Long shopId;
        private String shopName;
        private String rawMaterialName;
        private BigDecimal currentQuantity;
        private BigDecimal threshold;
    }
}
