package com.threemonks.service;

import com.threemonks.util.BusinessDay;
import com.threemonks.dto.*;
import com.threemonks.entity.*;
import com.threemonks.enums.OrderStatus;
import com.threemonks.enums.ProductCategory;
import com.threemonks.enums.Role;
import com.threemonks.enums.Station;
import com.threemonks.enums.StationStatus;
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
    private final OrderEventService orderEventService;
    private final PushNotificationService pushNotificationService;
    // Parcel (takeaway) packing charge per unit, by product type
    private static final BigDecimal SHOT_PARCEL_CHARGE = BigDecimal.valueOf(10);
    private static final BigDecimal BLEND_PARCEL_CHARGE = BigDecimal.valueOf(5);
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
        String orderNumber = "3M-" + BusinessDay.today().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
                + "-" + orderCounter.incrementAndGet() % 100000;

        // Generate daily token number (per shop, resets each business day)
        LocalDateTime startOfDay = BusinessDay.start(BusinessDay.today());
        LocalDateTime endOfDay = BusinessDay.end(BusinessDay.today());
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

        boolean parcel = Boolean.TRUE.equals(request.getParcel());
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal parcelCharge = BigDecimal.ZERO;

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

            if (parcel) {
                BigDecimal unitCharge = product.getCategory() == ProductCategory.SHOT
                        ? SHOT_PARCEL_CHARGE : BLEND_PARCEL_CHARGE;
                parcelCharge = parcelCharge.add(unitCharge.multiply(BigDecimal.valueOf(itemReq.getQuantity())));
            }
        }

        order.setShotStatus(hasItems(order, Station.SHOT) ? StationStatus.PENDING : StationStatus.NOT_REQUIRED);
        order.setBlendStatus(hasItems(order, Station.BLEND) ? StationStatus.PENDING : StationStatus.NOT_REQUIRED);
        order.setParcel(parcel);
        order.setParcelCharge(parcelCharge);
        order.setTotalAmount(total.add(parcelCharge));
        Order saved = orderRepository.save(order);
        orderEventService.publishAfterCommit(saved.getShop().getId(), "CREATED", saved.getId());
        pushNotificationService.notifyNewOrderAfterCommit(saved.getId());

        // Stock is NOT touched here. Stock is maintained manually through the
        // stock entry screens (purchase / consumption / adjustment), so placing
        // an order must have no effect on stock balances.

        return toResponse(saved);
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
        LocalDateTime startOfDay = BusinessDay.start(BusinessDay.today());
        LocalDateTime endOfDay = BusinessDay.end(BusinessDay.today());
        return orderRepository.findTodayOrdersByShopId(resolvedShopId, startOfDay, endOfDay).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // All pending orders, including ones left over from earlier days: they stay in the queue
    // until someone completes or cancels them. They still count on the day they were placed.
    public List<OrderResponse> getPendingOrders(Long shopId, UserPrincipal currentUser) {
        Long resolvedShopId = resolveShopId(shopId, currentUser);
        validateShopAccess(resolvedShopId, currentUser);
        return orderRepository.findPendingOrdersByShopId(resolvedShopId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Orders handed over during today's business day (by either station), including
    // left-over orders from earlier days, for the queue's "recently delivered" lists
    public List<OrderResponse> getHandedOverToday(Long shopId, UserPrincipal currentUser) {
        Long resolvedShopId = resolveShopId(shopId, currentUser);
        validateShopAccess(resolvedShopId, currentUser);
        LocalDate today = BusinessDay.today();
        return orderRepository.findHandedOverByShopId(resolvedShopId, BusinessDay.start(today), BusinessDay.end(today))
                .stream()
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
        Order order = findPendingForUpdate(id, currentUser);

        // Whole-order handover: every station still pending is done now
        LocalDateTime now = LocalDateTime.now();
        for (Station station : Station.values()) {
            if (stationStatus(order, station) == StationStatus.PENDING) {
                setStationDone(order, station, now);
            }
        }
        order.setStatus(OrderStatus.COMPLETED);
        Order saved = orderRepository.save(order);
        orderEventService.publishAfterCommit(saved.getShop().getId(), "UPDATED", saved.getId());
        return toResponse(saved);
    }

    // Station a shop operator is assigned to; null for both stations, managers and admins
    public Station getAssignedStation(UserPrincipal currentUser) {
        if (currentUser.getRole() != Role.SHOP_OPERATOR) {
            return null;
        }
        return userRepository.findById(currentUser.getId()).map(User::getStation).orElse(null);
    }

    @Transactional
    public OrderResponse completeStation(Long id, Station station, UserPrincipal currentUser) {
        Station assigned = getAssignedStation(currentUser);
        if (assigned != null && assigned != station) {
            throw new UnauthorizedException("You are assigned to the " + assigned.name().toLowerCase() + " station");
        }
        Order order = findPendingForUpdate(id, currentUser);

        StationStatus current = stationStatus(order, station);
        if (current == StationStatus.NOT_REQUIRED) {
            throw new BadRequestException("This order has no " + station.name().toLowerCase() + " items");
        }
        if (current == StationStatus.DONE) {
            throw new BadRequestException("This station is already done for this order");
        }
        setStationDone(order, station, LocalDateTime.now());

        // Store derived values too, so legacy orders get explicit statuses
        order.setShotStatus(stationStatus(order, Station.SHOT));
        order.setBlendStatus(stationStatus(order, Station.BLEND));
        if (order.getShotStatus() != StationStatus.PENDING && order.getBlendStatus() != StationStatus.PENDING) {
            order.setStatus(OrderStatus.COMPLETED);
        }
        Order saved = orderRepository.save(order);
        orderEventService.publishAfterCommit(saved.getShop().getId(), "UPDATED", saved.getId());
        return toResponse(saved);
    }

    private Order findPendingForUpdate(Long id, UserPrincipal currentUser) {
        Order order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        validateShopAccess(order.getShop().getId(), currentUser);

        if (order.getStatus() == OrderStatus.COMPLETED) {
            throw new BadRequestException("Order is already completed");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Cannot complete a cancelled order");
        }
        return order;
    }

    private void setStationDone(Order order, Station station, LocalDateTime at) {
        if (station == Station.SHOT) {
            order.setShotStatus(StationStatus.DONE);
            order.setShotCompletedAt(at);
        } else {
            order.setBlendStatus(StationStatus.DONE);
            order.setBlendCompletedAt(at);
        }
    }

    static boolean belongsTo(Product product, Station station) {
        boolean shot = product.getCategory() == ProductCategory.SHOT;
        return station == Station.SHOT ? shot : !shot;
    }

    private static boolean hasItems(Order order, Station station) {
        return order.getItems().stream().anyMatch(item -> belongsTo(item.getProduct(), station));
    }

    // Stored status, or for orders created before stations existed, derived from items and order status
    static StationStatus stationStatus(Order order, Station station) {
        StationStatus stored = station == Station.SHOT ? order.getShotStatus() : order.getBlendStatus();
        if (stored != null) {
            return stored;
        }
        if (!hasItems(order, station)) {
            return StationStatus.NOT_REQUIRED;
        }
        return order.getStatus() == OrderStatus.COMPLETED ? StationStatus.DONE : StationStatus.PENDING;
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
        orderEventService.publishAfterCommit(saved.getShop().getId(), "UPDATED", saved.getId());

        // Stock is NOT restored here. Stock is maintained manually through the
        // stock entry screens, so cancelling an order must have no effect on
        // stock balances.

        return toResponse(saved);
    }

    // Shop whose queue the user may follow: their own, or for an admin the requested/first active shop
    public Long resolveAccessibleShopId(Long requestShopId, UserPrincipal currentUser) {
        Long shopId = resolveShopId(requestShopId, currentUser);
        validateShopAccess(shopId, currentUser);
        return shopId;
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
                .parcel(Boolean.TRUE.equals(order.getParcel()))
                .parcelCharge(order.getParcelCharge() != null ? order.getParcelCharge() : BigDecimal.ZERO)
                .paymentMode(order.getPaymentMode())
                .status(order.getStatus())
                .shotStatus(stationStatus(order, Station.SHOT))
                .blendStatus(stationStatus(order, Station.BLEND))
                .shotCompletedAt(order.getShotCompletedAt())
                .blendCompletedAt(order.getBlendCompletedAt())
                .customerName(order.getCustomerName())
                .customerPhone(order.getCustomerPhone())
                .orderDate(order.getOrderDate())
                .businessDate(order.getOrderDate() != null ? BusinessDay.dateOf(order.getOrderDate()) : null)
                .tokenNumber(order.getTokenNumber())
                .build();
    }
}
