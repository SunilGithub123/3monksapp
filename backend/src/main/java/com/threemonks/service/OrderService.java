package com.threemonks.service;

import com.threemonks.dto.*;
import com.threemonks.entity.*;
import com.threemonks.enums.OrderStatus;
import com.threemonks.enums.Role;
import com.threemonks.exception.BadRequestException;
import com.threemonks.exception.ResourceNotFoundException;
import com.threemonks.exception.UnauthorizedException;
import com.threemonks.repository.*;
import com.threemonks.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final RecipeService recipeService;
    private final StockRepository stockRepository;
    private final StockHistoryRepository stockHistoryRepository;
    private static final AtomicLong orderCounter = new AtomicLong(System.currentTimeMillis());

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(OrderService.class);

    @Transactional
    public OrderResponse createOrder(OrderRequest request, UserPrincipal currentUser) {
        // Determine shop
        Long shopId = resolveShopId(request.getShopId(), currentUser);
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop", "id", shopId));
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        // Validate items
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Order must have at least one item");
        }

        // Generate order number
        String orderNumber = "3M-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
                + "-" + orderCounter.incrementAndGet() % 100000;

        // Generate daily token number (per shop, resets each day)
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        Integer maxToken = orderRepository.findMaxTokenNumberByShopAndDate(shopId, startOfDay, endOfDay);
        int tokenNumber = (maxToken != null ? maxToken : 0) + 1;

        Order order = Order.builder()
                .orderNumber(orderNumber)
                .shop(shop)
                .createdBy(user)
                .paymentMode(request.getPaymentMode())
                .status(OrderStatus.PENDING)
                .customerName(request.getCustomerName())
                .customerPhone(request.getCustomerPhone())
                .totalAmount(BigDecimal.ZERO)
                .orderDate(LocalDateTime.now())
                .tokenNumber(tokenNumber)
                .build();

        BigDecimal total = BigDecimal.ZERO;

        for (OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", "id", itemReq.getProductId()));

            BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            OrderItem item = OrderItem.builder()
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getPrice())
                    .subtotal(subtotal)
                    .customization(itemReq.getCustomization())
                    .build();

            order.addItem(item);
            total = total.add(subtotal);
        }

        order.setTotalAmount(total);
        Order saved = orderRepository.save(order);

        // Auto-deduct stock based on recipes
        deductStockForOrder(saved, user);

        return toResponse(saved);
    }

    private void deductStockForOrder(Order order, User user) {
        for (OrderItem item : order.getItems()) {
            List<Recipe> recipes = recipeService.getRecipeEntitiesByProduct(item.getProduct().getId());
            for (Recipe recipe : recipes) {
                BigDecimal consumeQty = recipe.getQuantityRequired().multiply(BigDecimal.valueOf(item.getQuantity()));

                Stock stock = stockRepository
                        .findByShopIdAndRawMaterialId(order.getShop().getId(), recipe.getRawMaterial().getId())
                        .orElse(null);

                if (stock != null) {
                    stock.setQuantity(stock.getQuantity().subtract(consumeQty));
                    stockRepository.save(stock);

                    StockHistory history = StockHistory.builder()
                            .shop(order.getShop())
                            .rawMaterial(recipe.getRawMaterial())
                            .quantityChange(consumeQty.negate())
                            .changeType("CONSUMED")
                            .notes("Order: " + order.getOrderNumber() + " | Product: " + item.getProduct().getName())
                            .changedBy(user)
                            .build();
                    stockHistoryRepository.save(history);

                    // Low stock warning
                    if (stock.getMinimumThreshold() != null
                            && stock.getQuantity().compareTo(stock.getMinimumThreshold()) <= 0) {
                        logger.warn("LOW STOCK ALERT: {} at {} - Current: {}, Threshold: {}",
                                recipe.getRawMaterial().getName(), order.getShop().getName(),
                                stock.getQuantity(), stock.getMinimumThreshold());
                    }
                } else {
                    logger.warn("No stock record found for material {} in shop {}",
                            recipe.getRawMaterial().getName(), order.getShop().getName());
                }
            }
        }
    }

    public OrderResponse getOrderById(Long id, UserPrincipal currentUser) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        validateShopAccess(order.getShop().getId(), currentUser);
        return toResponse(order);
    }

    public OrderResponse getOrderByNumber(String orderNumber, UserPrincipal currentUser) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "orderNumber", orderNumber));
        validateShopAccess(order.getShop().getId(), currentUser);
        return toResponse(order);
    }

    public List<OrderResponse> getOrdersByShop(Long shopId, UserPrincipal currentUser) {
        validateShopAccess(shopId, currentUser);
        return orderRepository.findByShopIdOrderByCreatedAtDesc(shopId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<OrderResponse> getAllOrders(Long shopId, UserPrincipal currentUser) {
        if (shopId != null) {
            validateShopAccess(shopId, currentUser);
            return orderRepository.findByShopIdOrderByCreatedAtDesc(shopId).stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        Long resolvedShopId = currentUser.getShopId();
        return orderRepository.findByShopIdOrderByCreatedAtDesc(resolvedShopId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<OrderResponse> getTodayOrders(Long shopId, UserPrincipal currentUser) {
        Long resolvedShopId = resolveShopId(shopId, currentUser);
        validateShopAccess(resolvedShopId, currentUser);
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        return orderRepository.findTodayOrdersByShopId(resolvedShopId, startOfDay, endOfDay).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<OrderResponse> getPendingOrders(Long shopId, UserPrincipal currentUser) {
        Long resolvedShopId = resolveShopId(shopId, currentUser);
        validateShopAccess(resolvedShopId, currentUser);
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        return orderRepository.findTodayPendingOrdersByShopId(resolvedShopId, startOfDay, endOfDay).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<OrderResponse> getOrdersByDateRange(Long shopId, LocalDateTime start, LocalDateTime end,
            UserPrincipal currentUser) {
        if (shopId != null) {
            validateShopAccess(shopId, currentUser);
            return orderRepository.findByShopIdAndOrderDateBetween(shopId, start, end).stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        if (currentUser.getRole() != Role.SUPER_ADMIN) {
            throw new UnauthorizedException("Only admin can view all shops' orders");
        }
        return orderRepository.findByOrderDateBetween(start, end).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderResponse completeOrder(Long id, UserPrincipal currentUser) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        validateShopAccess(order.getShop().getId(), currentUser);

        if (order.getStatus() == OrderStatus.COMPLETED) {
            throw new BadRequestException("Order is already completed");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Cannot complete a cancelled order");
        }

        order.setStatus(OrderStatus.COMPLETED);
        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse cancelOrder(Long id, UserPrincipal currentUser) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        validateShopAccess(order.getShop().getId(), currentUser);

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Order is already cancelled");
        }

        order.setStatus(OrderStatus.CANCELLED);
        Order saved = orderRepository.save(order);

        // Restore stock when order is cancelled
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));
        restoreStockForOrder(saved, user);

        return toResponse(saved);
    }

    private void restoreStockForOrder(Order order, User user) {
        for (OrderItem item : order.getItems()) {
            List<Recipe> recipes = recipeService.getRecipeEntitiesByProduct(item.getProduct().getId());
            for (Recipe recipe : recipes) {
                BigDecimal restoreQty = recipe.getQuantityRequired().multiply(BigDecimal.valueOf(item.getQuantity()));

                Stock stock = stockRepository.findByShopIdAndRawMaterialId(
                        order.getShop().getId(), recipe.getRawMaterial().getId())
                        .orElse(null);

                if (stock != null) {
                    stock.setQuantity(stock.getQuantity().add(restoreQty));
                    stockRepository.save(stock);

                    StockHistory history = StockHistory.builder()
                            .shop(order.getShop())
                            .rawMaterial(recipe.getRawMaterial())
                            .quantityChange(restoreQty)
                            .changeType("RESTORED")
                            .notes("Order cancelled: " + order.getOrderNumber() + " | Product: "
                                    + item.getProduct().getName())
                            .changedBy(user)
                            .build();
                    stockHistoryRepository.save(history);

                    logger.info("STOCK RESTORED: {} +{} at {} (Order: {})",
                            recipe.getRawMaterial().getName(), restoreQty,
                            order.getShop().getName(), order.getOrderNumber());
                }
            }
        }
    }

    private Long resolveShopId(Long requestShopId, UserPrincipal currentUser) {
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            return requestShopId != null ? requestShopId
                    : shopRepository.findByActiveTrue().stream().findFirst()
                            .orElseThrow(() -> new BadRequestException("No active shops")).getId();
        }
        return currentUser.getShopId();
    }

    private void validateShopAccess(Long shopId, UserPrincipal currentUser) {
        if (currentUser.getRole() != Role.SUPER_ADMIN && !currentUser.getShopId().equals(shopId)) {
            throw new UnauthorizedException("Access denied to this shop's data");
        }
    }

    private OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productCategory(item.getProduct().getCategory().name())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .subtotal(item.getSubtotal())
                        .customization(item.getCustomization())
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .shopId(order.getShop().getId())
                .shopName(order.getShop().getName())
                .createdByName(order.getCreatedBy().getFullName())
                .items(items)
                .totalAmount(order.getTotalAmount())
                .paymentMode(order.getPaymentMode())
                .status(order.getStatus())
                .customerName(order.getCustomerName())
                .customerPhone(order.getCustomerPhone())
                .orderDate(order.getOrderDate())
                .tokenNumber(order.getTokenNumber())
                .build();
    }
}
