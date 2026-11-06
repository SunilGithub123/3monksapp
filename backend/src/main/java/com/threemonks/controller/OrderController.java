package com.threemonks.controller;

import com.threemonks.dto.*;
import com.threemonks.enums.Station;
import com.threemonks.service.OrderEventService;
import com.threemonks.service.OrderService;
import com.threemonks.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final OrderEventService orderEventService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @Valid @RequestBody OrderRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success("Order created", orderService.createOrder(request, currentUser)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrderById(id, currentUser)));
    }

    @GetMapping("/number/{orderNumber}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderByNumber(
            @PathVariable String orderNumber,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrderByNumber(orderNumber, currentUser)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getAllOrders(
            @RequestParam(required = false) Long shopId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getAllOrders(shopId, currentUser)));
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getShopOrders(
            @PathVariable Long shopId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrdersByShop(shopId, currentUser)));
    }

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getTodayOrders(
            @RequestParam(required = false) Long shopId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getTodayOrders(shopId, currentUser)));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getPendingOrders(
            @RequestParam(required = false) Long shopId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getPendingOrders(shopId, currentUser)));
    }

    // Orders handed over today, including left-over orders from earlier days (Order Queue)
    @GetMapping("/handed-over-today")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getHandedOverToday(
            @RequestParam(required = false) Long shopId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getHandedOverToday(shopId, currentUser)));
    }

    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrdersByRange(
            @RequestParam(required = false) Long shopId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrdersByDateRange(shopId, from, to, currentUser)));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<OrderResponse>> completeOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success("Order delivered", orderService.completeOrder(id, currentUser)));
    }

    // Live "orders changed" events for the user's shop queue (server-sent events)
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamOrderEvents(
            @RequestParam(required = false) Long shopId,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletResponse response) {
        // Tell nginx not to buffer the stream
        response.setHeader("X-Accel-Buffering", "no");
        return orderEventService.subscribe(orderService.resolveAccessibleShopId(shopId, currentUser));
    }

    // Queue station assigned to the logged-in user; station is null when not restricted
    @GetMapping("/my-station")
    public ResponseEntity<ApiResponse<Map<String, Station>>> getMyStation(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(
                Collections.singletonMap("station", orderService.getAssignedStation(currentUser))));
    }

    @PatchMapping("/{id}/complete-station")
    public ResponseEntity<ApiResponse<OrderResponse>> completeStation(
            @PathVariable Long id,
            @RequestParam Station station,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success("Station done", orderService.completeStation(id, station, currentUser)));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success("Order cancelled", orderService.cancelOrder(id, currentUser)));
    }
}
