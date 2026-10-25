package com.threemonks.service;

import com.threemonks.dto.AnalyticsResponse;
import com.threemonks.entity.Order;
import com.threemonks.entity.Stock;
import com.threemonks.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PurchaseRepository purchaseRepository;
    private final StockRepository stockRepository;
    private final StockHistoryRepository stockHistoryRepository;
    private final EmployeeRepository employeeRepository;

    public AnalyticsResponse getAnalytics(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);

        return AnalyticsResponse.builder()
                .dailySales(getDailySales(from, to, start, end))
                .productWiseSales(getProductWiseSales(start, end))
                .rawMaterialUsage(getRawMaterialUsage(start, end))
                .vendorWisePurchases(getVendorWisePurchases(from, to))
                .monthlyPnL(getMonthlyPnL(from, to))
                .breakEven(getBreakEven(from, to, start, end))
                .build();
    }

    private Map<String, BigDecimal> getDailySales(LocalDate from, LocalDate to, LocalDateTime start, LocalDateTime end) {
        Map<String, BigDecimal> dailySales = new LinkedHashMap<>();
        List<Order> orders = orderRepository.findCompletedOrdersByDateRange(start, end);

        // Group by date
        Map<LocalDate, BigDecimal> grouped = orders.stream()
                .collect(Collectors.groupingBy(
                        o -> o.getOrderDate().toLocalDate(),
                        Collectors.reducing(BigDecimal.ZERO, Order::getTotalAmount, BigDecimal::add)
                ));

        // Fill all dates in range
        LocalDate current = from;
        while (!current.isAfter(to)) {
            dailySales.put(current.toString(), grouped.getOrDefault(current, BigDecimal.ZERO));
            current = current.plusDays(1);
        }
        return dailySales;
    }

    private List<AnalyticsResponse.ProductSalesDTO> getProductWiseSales(LocalDateTime start, LocalDateTime end) {
        return orderItemRepository.getTopProducts(start, end).stream()
                .map(row -> AnalyticsResponse.ProductSalesDTO.builder()
                        .productName((String) row[0])
                        .quantity((Long) row[1])
                        .revenue((BigDecimal) row[2])
                        .build())
                .collect(Collectors.toList());
    }

    private List<AnalyticsResponse.MaterialUsageDTO> getRawMaterialUsage(LocalDateTime start, LocalDateTime end) {
        List<Object[]> consumed = stockHistoryRepository.getMaterialUsageByType("CONSUMED", start, end);

        // Get all stock for current levels
        List<Stock> allStock = stockRepository.findAll();
        Map<String, BigDecimal> currentStockMap = new HashMap<>();
        Map<String, BigDecimal> reorderMap = new HashMap<>();
        for (Stock s : allStock) {
            String name = s.getRawMaterial().getName();
            currentStockMap.merge(name, s.getQuantity(), BigDecimal::add);
            if (s.getRawMaterial().getReorderLevel() != null) {
                reorderMap.putIfAbsent(name, s.getRawMaterial().getReorderLevel());
            }
        }

        return consumed.stream().map(row -> {
            String name = (String) row[0];
            String unitType = row[1].toString();
            BigDecimal totalConsumed = ((BigDecimal) row[2]).abs();
            BigDecimal current = currentStockMap.getOrDefault(name, BigDecimal.ZERO);
            BigDecimal reorder = reorderMap.getOrDefault(name, BigDecimal.ZERO);

            return AnalyticsResponse.MaterialUsageDTO.builder()
                    .materialName(name)
                    .unitType(unitType)
                    .totalConsumed(totalConsumed)
                    .currentStock(current)
                    .reorderLevel(reorder)
                    .lowStock(reorder.compareTo(BigDecimal.ZERO) > 0 && current.compareTo(reorder) <= 0)
                    .build();
        }).collect(Collectors.toList());
    }

    private List<AnalyticsResponse.VendorPurchaseDTO> getVendorWisePurchases(LocalDate from, LocalDate to) {
        return purchaseRepository.getVendorWisePurchases(from, to).stream()
                .map(row -> AnalyticsResponse.VendorPurchaseDTO.builder()
                        .vendorName((String) row[0])
                        .purchaseCount((Long) row[1])
                        .totalQuantity((BigDecimal) row[2])
                        .totalCost((BigDecimal) row[3])
                        .build())
                .collect(Collectors.toList());
    }

    private Map<String, AnalyticsResponse.ProfitLossDTO> getMonthlyPnL(LocalDate from, LocalDate to) {
        Map<String, AnalyticsResponse.ProfitLossDTO> monthly = new LinkedHashMap<>();
        YearMonth startMonth = YearMonth.from(from);
        YearMonth endMonth = YearMonth.from(to);

        YearMonth current = startMonth;
        while (!current.isAfter(endMonth)) {
            LocalDateTime monthStart = current.atDay(1).atStartOfDay();
            LocalDateTime monthEnd = current.atEndOfMonth().atTime(LocalTime.MAX);
            LocalDate monthStartDate = current.atDay(1);
            LocalDate monthEndDate = current.atEndOfMonth();

            BigDecimal revenue = Optional.ofNullable(orderRepository.getTotalSalesByDateRange(monthStart, monthEnd))
                    .orElse(BigDecimal.ZERO);
            BigDecimal cost = Optional.ofNullable(purchaseRepository.getTotalCostByDateRange(monthStartDate, monthEndDate))
                    .orElse(BigDecimal.ZERO);
            Long orders = Optional.ofNullable(orderRepository.getOrderCountByDateRange(monthStart, monthEnd))
                    .orElse(0L);

            monthly.put(current.toString(), AnalyticsResponse.ProfitLossDTO.builder()
                    .revenue(revenue)
                    .cost(cost)
                    .profit(revenue.subtract(cost))
                    .orders(orders)
                    .build());

            current = current.plusMonths(1);
        }
        return monthly;
    }

    private AnalyticsResponse.BreakEvenDTO getBreakEven(LocalDate from, LocalDate to, LocalDateTime start, LocalDateTime end) {
        // Fixed costs = total employee salaries for the period
        BigDecimal totalFixedCost = employeeRepository.findByActiveTrue().stream()
                .map(e -> e.getSalary())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Variable costs = purchases
        BigDecimal totalVariableCost = Optional.ofNullable(purchaseRepository.getTotalCostByDateRange(from, to))
                .orElse(BigDecimal.ZERO);

        BigDecimal totalRevenue = Optional.ofNullable(orderRepository.getTotalSalesByDateRange(start, end))
                .orElse(BigDecimal.ZERO);

        // Break-even = Fixed Costs / (1 - Variable Costs / Revenue)
        BigDecimal breakEvenRevenue = BigDecimal.ZERO;
        if (totalRevenue.compareTo(BigDecimal.ZERO) > 0 && totalRevenue.compareTo(totalVariableCost) > 0) {
            BigDecimal contributionMarginRatio = BigDecimal.ONE.subtract(
                    totalVariableCost.divide(totalRevenue, 4, RoundingMode.HALF_UP));
            if (contributionMarginRatio.compareTo(BigDecimal.ZERO) > 0) {
                breakEvenRevenue = totalFixedCost.divide(contributionMarginRatio, 2, RoundingMode.HALF_UP);
            }
        }

        BigDecimal totalCost = totalFixedCost.add(totalVariableCost);

        return AnalyticsResponse.BreakEvenDTO.builder()
                .totalFixedCost(totalFixedCost)
                .totalVariableCost(totalVariableCost)
                .totalRevenue(totalRevenue)
                .breakEvenRevenue(breakEvenRevenue)
                .isAboveBreakEven(totalRevenue.compareTo(totalCost) >= 0)
                .margin(totalRevenue.subtract(totalCost))
                .build();
    }
}
