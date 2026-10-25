package com.threemonks.service;

import com.threemonks.dto.DashboardResponse;
import com.threemonks.dto.ProfitLossResponse;
import com.threemonks.entity.Shop;
import com.threemonks.entity.Stock;
import com.threemonks.enums.Role;
import com.threemonks.exception.UnauthorizedException;
import com.threemonks.repository.*;
import com.threemonks.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PurchaseRepository purchaseRepository;
    private final StockRepository stockRepository;
    private final ShopRepository shopRepository;

    public DashboardResponse getSuperAdminDashboard(LocalDate fromDate, LocalDate toDate) {
        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime end = toDate.atTime(LocalTime.MAX);

        BigDecimal totalSales = Optional.ofNullable(orderRepository.getTotalSalesByDateRange(start, end))
                .orElse(BigDecimal.ZERO);
        Long totalOrders = Optional.ofNullable(orderRepository.getOrderCountByDateRange(start, end))
                .orElse(0L);
        BigDecimal totalCost = Optional.ofNullable(purchaseRepository.getTotalCostByDateRange(fromDate, toDate))
                .orElse(BigDecimal.ZERO);

        // Top products
        List<DashboardResponse.TopProductDTO> topProducts = orderItemRepository.getTopProducts(start, end).stream()
                .limit(10)
                .map(row -> DashboardResponse.TopProductDTO.builder()
                        .productName((String) row[0])
                        .totalQuantity((Long) row[1])
                        .totalRevenue((BigDecimal) row[2])
                        .build())
                .collect(Collectors.toList());

        // Sales per shop
        List<DashboardResponse.SalesPerShopDTO> salesPerShop = shopRepository.findByActiveTrue().stream()
                .map(shop -> {
                    BigDecimal shopSales = Optional.ofNullable(
                            orderRepository.getTotalSalesByShopAndDateRange(shop.getId(), start, end))
                            .orElse(BigDecimal.ZERO);
                    Long shopOrders = Optional.ofNullable(
                            orderRepository.getOrderCountByShopAndDateRange(shop.getId(), start, end))
                            .orElse(0L);
                    return DashboardResponse.SalesPerShopDTO.builder()
                            .shopId(shop.getId())
                            .shopName(shop.getName())
                            .totalSales(shopSales)
                            .orderCount(shopOrders)
                            .build();
                })
                .collect(Collectors.toList());

        // Low stock alerts
        List<DashboardResponse.LowStockAlertDTO> lowStockAlerts = stockRepository.findAllLowStock().stream()
                .map(s -> DashboardResponse.LowStockAlertDTO.builder()
                        .shopId(s.getShop().getId())
                        .shopName(s.getShop().getName())
                        .rawMaterialName(s.getRawMaterial().getName())
                        .currentQuantity(s.getQuantity())
                        .threshold(s.getMinimumThreshold())
                        .build())
                .collect(Collectors.toList());

        // Monthly sales
        Map<String, BigDecimal> monthlySales = getMonthlySales(null, fromDate, toDate);

        return DashboardResponse.builder()
                .totalSales(totalSales)
                .totalOrders(totalOrders)
                .totalRevenue(totalSales)
                .totalCost(totalCost)
                .totalProfit(totalSales.subtract(totalCost))
                .topProducts(topProducts)
                .salesPerShop(salesPerShop)
                .lowStockAlerts(lowStockAlerts)
                .monthlySales(monthlySales)
                .build();
    }

    public DashboardResponse getShopDashboard(Long shopId, LocalDate fromDate, LocalDate toDate, UserPrincipal currentUser) {
        if (currentUser.getRole() != Role.SUPER_ADMIN && !currentUser.getShopId().equals(shopId)) {
            throw new UnauthorizedException("Access denied to this shop's dashboard");
        }

        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime end = toDate.atTime(LocalTime.MAX);
        Shop shop = shopRepository.findById(shopId).orElseThrow();

        BigDecimal totalSales = Optional.ofNullable(orderRepository.getTotalSalesByShopAndDateRange(shopId, start, end))
                .orElse(BigDecimal.ZERO);
        Long totalOrders = Optional.ofNullable(orderRepository.getOrderCountByShopAndDateRange(shopId, start, end))
                .orElse(0L);
        BigDecimal totalCost = Optional.ofNullable(purchaseRepository.getTotalCostByShopAndDateRange(shopId, fromDate, toDate))
                .orElse(BigDecimal.ZERO);

        List<DashboardResponse.TopProductDTO> topProducts = orderItemRepository.getTopProductsByShop(shopId, start, end).stream()
                .limit(10)
                .map(row -> DashboardResponse.TopProductDTO.builder()
                        .productName((String) row[0])
                        .totalQuantity((Long) row[1])
                        .totalRevenue((BigDecimal) row[2])
                        .build())
                .collect(Collectors.toList());

        List<DashboardResponse.LowStockAlertDTO> lowStockAlerts = stockRepository.findLowStockByShopId(shopId).stream()
                .map(s -> DashboardResponse.LowStockAlertDTO.builder()
                        .shopId(s.getShop().getId())
                        .shopName(s.getShop().getName())
                        .rawMaterialName(s.getRawMaterial().getName())
                        .currentQuantity(s.getQuantity())
                        .threshold(s.getMinimumThreshold())
                        .build())
                .collect(Collectors.toList());

        Map<String, BigDecimal> monthlySales = getMonthlySales(shopId, fromDate, toDate);

        return DashboardResponse.builder()
                .totalSales(totalSales)
                .totalOrders(totalOrders)
                .totalRevenue(totalSales)
                .totalCost(totalCost)
                .totalProfit(totalSales.subtract(totalCost))
                .topProducts(topProducts)
                .lowStockAlerts(lowStockAlerts)
                .monthlySales(monthlySales)
                .build();
    }

    public ProfitLossResponse getProfitLoss(Long shopId, LocalDate fromDate, LocalDate toDate, UserPrincipal currentUser) {
        if (shopId != null && currentUser.getRole() != Role.SUPER_ADMIN && !currentUser.getShopId().equals(shopId)) {
            throw new UnauthorizedException("Access denied");
        }

        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime end = toDate.atTime(LocalTime.MAX);

        BigDecimal revenue;
        BigDecimal cost;
        Long orderCount;
        String shopName = "All Shops";

        if (shopId != null) {
            revenue = Optional.ofNullable(orderRepository.getTotalSalesByShopAndDateRange(shopId, start, end))
                    .orElse(BigDecimal.ZERO);
            cost = Optional.ofNullable(purchaseRepository.getTotalCostByShopAndDateRange(shopId, fromDate, toDate))
                    .orElse(BigDecimal.ZERO);
            orderCount = Optional.ofNullable(orderRepository.getOrderCountByShopAndDateRange(shopId, start, end))
                    .orElse(0L);
            shopName = shopRepository.findById(shopId).map(Shop::getName).orElse("Unknown");
        } else {
            revenue = Optional.ofNullable(orderRepository.getTotalSalesByDateRange(start, end))
                    .orElse(BigDecimal.ZERO);
            cost = Optional.ofNullable(purchaseRepository.getTotalCostByDateRange(fromDate, toDate))
                    .orElse(BigDecimal.ZERO);
            orderCount = Optional.ofNullable(orderRepository.getOrderCountByDateRange(start, end))
                    .orElse(0L);
        }

        return ProfitLossResponse.builder()
                .fromDate(fromDate)
                .toDate(toDate)
                .shopId(shopId)
                .shopName(shopName)
                .totalRevenue(revenue)
                .totalCost(cost)
                .profit(revenue.subtract(cost))
                .totalOrders(orderCount)
                .build();
    }

    private Map<String, BigDecimal> getMonthlySales(Long shopId, LocalDate fromDate, LocalDate toDate) {
        Map<String, BigDecimal> monthlySales = new LinkedHashMap<>();
        YearMonth startMonth = YearMonth.from(fromDate);
        YearMonth endMonth = YearMonth.from(toDate);

        YearMonth current = startMonth;
        while (!current.isAfter(endMonth)) {
            LocalDateTime monthStart = current.atDay(1).atStartOfDay();
            LocalDateTime monthEnd = current.atEndOfMonth().atTime(LocalTime.MAX);

            BigDecimal sales;
            if (shopId != null) {
                sales = Optional.ofNullable(orderRepository.getTotalSalesByShopAndDateRange(shopId, monthStart, monthEnd))
                        .orElse(BigDecimal.ZERO);
            } else {
                sales = Optional.ofNullable(orderRepository.getTotalSalesByDateRange(monthStart, monthEnd))
                        .orElse(BigDecimal.ZERO);
            }
            monthlySales.put(current.toString(), sales);
            current = current.plusMonths(1);
        }
        return monthlySales;
    }
}
