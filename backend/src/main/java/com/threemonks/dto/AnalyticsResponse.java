package com.threemonks.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class AnalyticsResponse {

    // Daily sales
    private Map<String, BigDecimal> dailySales;

    // Product-wise sales
    private List<ProductSalesDTO> productWiseSales;

    // Raw material usage
    private List<MaterialUsageDTO> rawMaterialUsage;

    // Vendor-wise purchases
    private List<VendorPurchaseDTO> vendorWisePurchases;

    // Monthly P&L
    private Map<String, ProfitLossDTO> monthlyPnL;

    // Break-even
    private BreakEvenDTO breakEven;

    @Data
    @Builder
    public static class ProductSalesDTO {
        private String productName;
        private String category;
        private Long quantity;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    public static class MaterialUsageDTO {
        private String materialName;
        private String unitType;
        private BigDecimal totalConsumed;
        private BigDecimal currentStock;
        private BigDecimal reorderLevel;
        private Boolean lowStock;
    }

    @Data
    @Builder
    public static class VendorPurchaseDTO {
        private String vendorName;
        private Long purchaseCount;
        private BigDecimal totalQuantity;
        private BigDecimal totalCost;
        private BigDecimal totalGst;
    }

    @Data
    @Builder
    public static class ProfitLossDTO {
        private BigDecimal revenue;
        private BigDecimal cost;
        private BigDecimal profit;
        private Long orders;
    }

    @Data
    @Builder
    public static class BreakEvenDTO {
        private BigDecimal totalFixedCost;
        private BigDecimal totalVariableCost;
        private BigDecimal totalRevenue;
        private BigDecimal breakEvenRevenue;
        private Boolean isAboveBreakEven;
        private BigDecimal margin;
    }
}
