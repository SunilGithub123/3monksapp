package com.threemonks.controller;

import com.threemonks.dto.*;
import com.threemonks.service.*;
import com.threemonks.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SHOP_MANAGER')")
@RequiredArgsConstructor
public class ManagerController {

    private final UserService userService;
    private final StockService stockService;
    private final AuthService authService;

    // Users in shop
    @GetMapping("/shop/{shopId}/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getShopUsers(
            @PathVariable Long shopId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUsersByShop(shopId)));
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody UserRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success("User created", userService.createUser(request, currentUser)));
    }

    // Stock management
    @GetMapping("/shop/{shopId}/stock")
    public ResponseEntity<ApiResponse<List<StockResponse>>> getShopStock(
            @PathVariable Long shopId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(stockService.getStockByShop(shopId, currentUser)));
    }

    @PostMapping("/stock")
    public ResponseEntity<ApiResponse<StockResponse>> addStock(
            @Valid @RequestBody StockRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success("Stock added", stockService.addStock(request, currentUser)));
    }

    @PutMapping("/stock/{id}")
    public ResponseEntity<ApiResponse<StockResponse>> updateStock(
            @PathVariable Long id,
            @Valid @RequestBody StockRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success("Stock updated", stockService.updateStock(id, request, currentUser)));
    }

    @GetMapping("/shop/{shopId}/stock/low")
    public ResponseEntity<ApiResponse<List<StockResponse>>> getLowStock(
            @PathVariable Long shopId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(stockService.getLowStockByShop(shopId, currentUser)));
    }

    // Purchase management
    @PostMapping("/purchases")
    public ResponseEntity<ApiResponse<PurchaseResponse>> createPurchase(
            @Valid @RequestBody PurchaseRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success("Purchase recorded", stockService.createPurchase(request, currentUser)));
    }

    @GetMapping("/shop/{shopId}/purchases")
    public ResponseEntity<ApiResponse<List<PurchaseResponse>>> getShopPurchases(
            @PathVariable Long shopId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(stockService.getPurchasesByShop(shopId, currentUser)));
    }
}
