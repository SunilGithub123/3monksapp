package com.threemonks.service;

import com.threemonks.dto.PurchaseRequest;
import com.threemonks.dto.PurchaseResponse;
import com.threemonks.dto.StockRequest;
import com.threemonks.dto.StockResponse;
import com.threemonks.entity.*;
import com.threemonks.enums.Role;
import com.threemonks.exception.ResourceNotFoundException;
import com.threemonks.exception.UnauthorizedException;
import com.threemonks.repository.*;
import com.threemonks.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StockService {

        private final StockRepository stockRepository;
        private final StockHistoryRepository stockHistoryRepository;
        private final PurchaseRepository purchaseRepository;
        private final RawMaterialRepository rawMaterialRepository;
        private final ShopRepository shopRepository;
        private final UserRepository userRepository;

        public List<StockResponse> getStockByShop(Long shopId, UserPrincipal currentUser) {
                validateShopAccess(shopId, currentUser);
                return stockRepository.findByShopId(shopId).stream()
                                .map(this::toStockResponse)
                                .collect(Collectors.toList());
        }

        public List<StockResponse> getAllLowStock() {
                return stockRepository.findAllLowStock().stream()
                                .map(this::toStockResponse)
                                .collect(Collectors.toList());
        }

        public List<StockResponse> getLowStockByShop(Long shopId, UserPrincipal currentUser) {
                validateShopAccess(shopId, currentUser);
                return stockRepository.findLowStockByShopId(shopId).stream()
                                .map(this::toStockResponse)
                                .collect(Collectors.toList());
        }

        @Transactional
        public StockResponse addStock(StockRequest request, UserPrincipal currentUser) {
                validateShopAccess(request.getShopId(), currentUser);

                Shop shop = shopRepository.findById(request.getShopId())
                                .orElseThrow(() -> new ResourceNotFoundException("Shop", "id", request.getShopId()));
                RawMaterial rm = rawMaterialRepository.findById(request.getRawMaterialId())
                                .orElseThrow(() -> new ResourceNotFoundException("RawMaterial", "id",
                                                request.getRawMaterialId()));
                User user = userRepository.findById(currentUser.getId())
                                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

                Stock stock = stockRepository
                                .findByShopIdAndRawMaterialId(request.getShopId(), request.getRawMaterialId())
                                .orElse(Stock.builder()
                                                .shop(shop)
                                                .rawMaterial(rm)
                                                .quantity(BigDecimal.ZERO)
                                                .openingStock(BigDecimal.ZERO)
                                                .build());

                // Set opening stock on first ever stock entry
                if (stock.getId() == null) {
                        stock.setOpeningStock(request.getQuantity());
                }
                stock.setQuantity(stock.getQuantity().add(request.getQuantity()));
                if (request.getMinimumThreshold() != null) {
                        stock.setMinimumThreshold(request.getMinimumThreshold());
                }

                Stock saved = stockRepository.save(stock);

                // Record history
                StockHistory history = StockHistory.builder()
                                .shop(shop)
                                .rawMaterial(rm)
                                .quantityChange(request.getQuantity())
                                .changeType("ADDED")
                                .notes(request.getNotes())
                                .changedBy(user)
                                .build();
                stockHistoryRepository.save(history);

                return toStockResponse(saved);
        }

        @Transactional
        public StockResponse updateStock(Long stockId, StockRequest request, UserPrincipal currentUser) {
                Stock stock = stockRepository.findById(stockId)
                                .orElseThrow(() -> new ResourceNotFoundException("Stock", "id", stockId));
                validateShopAccess(stock.getShop().getId(), currentUser);

                User user = userRepository.findById(currentUser.getId())
                                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

                BigDecimal diff = request.getQuantity().subtract(stock.getQuantity());
                stock.setQuantity(request.getQuantity());
                if (request.getMinimumThreshold() != null) {
                        stock.setMinimumThreshold(request.getMinimumThreshold());
                }

                Stock saved = stockRepository.save(stock);

                StockHistory history = StockHistory.builder()
                                .shop(stock.getShop())
                                .rawMaterial(stock.getRawMaterial())
                                .quantityChange(diff)
                                .changeType("ADJUSTED")
                                .notes(request.getNotes())
                                .changedBy(user)
                                .build();
                stockHistoryRepository.save(history);

                return toStockResponse(saved);
        }

        // Purchase management
        @Transactional
        public PurchaseResponse createPurchase(PurchaseRequest request, UserPrincipal currentUser) {
                validateShopAccess(request.getShopId(), currentUser);

                Shop shop = shopRepository.findById(request.getShopId())
                                .orElseThrow(() -> new ResourceNotFoundException("Shop", "id", request.getShopId()));
                RawMaterial rm = rawMaterialRepository.findById(request.getRawMaterialId())
                                .orElseThrow(() -> new ResourceNotFoundException("RawMaterial", "id",
                                                request.getRawMaterialId()));
                User user = userRepository.findById(currentUser.getId())
                                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

                Purchase purchase = Purchase.builder()
                                .shop(shop)
                                .rawMaterial(rm)
                                .quantity(request.getQuantity())
                                .totalCost(request.getTotalCost())
                                .vendorName(request.getVendorName())
                                .invoiceNumber(request.getInvoiceNumber())
                                .purchaseDate(request.getPurchaseDate() != null ? request.getPurchaseDate()
                                                : LocalDate.now())
                                .purchasedBy(user)
                                .gstPercentage(request.getGstPercentage())
                                .gstAmount(request.getGstAmount())
                                .build();

                Purchase saved = purchaseRepository.save(purchase);

                // Update last purchase date on raw material
                rm.setLastPurchaseDate(saved.getPurchaseDate());
                rawMaterialRepository.save(rm);

                // Auto-add to stock
                StockRequest stockReq = new StockRequest();
                stockReq.setShopId(request.getShopId());
                stockReq.setRawMaterialId(request.getRawMaterialId());
                stockReq.setQuantity(request.getQuantity());
                stockReq.setNotes("Purchase: " + request.getInvoiceNumber());
                addStock(stockReq, currentUser);

                return toPurchaseResponse(saved);
        }

        public List<PurchaseResponse> getPurchasesByShop(Long shopId, UserPrincipal currentUser) {
                validateShopAccess(shopId, currentUser);
                return purchaseRepository.findByShopIdOrderByCreatedAtDesc(shopId).stream()
                                .map(this::toPurchaseResponse)
                                .collect(Collectors.toList());
        }

        @Transactional
        public void deletePurchase(Long purchaseId, UserPrincipal currentUser) {
                Purchase purchase = purchaseRepository.findById(purchaseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Purchase", "id", purchaseId));

                if (currentUser.getRole() != Role.SUPER_ADMIN) {
                        throw new UnauthorizedException("Only admin can delete purchases");
                }

                User user = userRepository.findById(currentUser.getId())
                                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

                // Reverse stock addition
                Stock stock = stockRepository.findByShopIdAndRawMaterialId(
                                purchase.getShop().getId(), purchase.getRawMaterial().getId())
                                .orElse(null);

                if (stock != null) {
                        stock.setQuantity(stock.getQuantity().subtract(purchase.getQuantity()));
                        stockRepository.save(stock);

                        StockHistory history = StockHistory.builder()
                                        .shop(purchase.getShop())
                                        .rawMaterial(purchase.getRawMaterial())
                                        .quantityChange(purchase.getQuantity().negate())
                                        .changeType("PURCHASE_DELETED")
                                        .notes("Purchase deleted: "
                                                        + (purchase.getInvoiceNumber() != null
                                                                        ? purchase.getInvoiceNumber()
                                                                        : "N/A")
                                                        + " | Vendor: "
                                                        + (purchase.getVendorName() != null ? purchase.getVendorName()
                                                                        : "N/A"))
                                        .changedBy(user)
                                        .build();
                        stockHistoryRepository.save(history);
                }

                purchaseRepository.delete(purchase);
        }

        private void validateShopAccess(Long shopId, UserPrincipal currentUser) {
                if (currentUser.getRole() != Role.SUPER_ADMIN && !currentUser.getShopId().equals(shopId)) {
                        throw new UnauthorizedException("Access denied to this shop's data");
                }
        }

        private StockResponse toStockResponse(Stock stock) {
                boolean isLow = stock.getMinimumThreshold() != null
                                && stock.getQuantity().compareTo(stock.getMinimumThreshold()) <= 0;

                return StockResponse.builder()
                                .id(stock.getId())
                                .shopId(stock.getShop().getId())
                                .shopName(stock.getShop().getName())
                                .rawMaterialId(stock.getRawMaterial().getId())
                                .rawMaterialName(stock.getRawMaterial().getName())
                                .unitType(stock.getRawMaterial().getUnitType().name())
                                .quantity(stock.getQuantity())
                                .openingStock(stock.getOpeningStock())
                                .minimumThreshold(stock.getMinimumThreshold())
                                .lowStock(isLow)
                                .build();
        }

        private PurchaseResponse toPurchaseResponse(Purchase p) {
                return PurchaseResponse.builder()
                                .id(p.getId())
                                .shopId(p.getShop().getId())
                                .shopName(p.getShop().getName())
                                .rawMaterialId(p.getRawMaterial().getId())
                                .rawMaterialName(p.getRawMaterial().getName())
                                .quantity(p.getQuantity())
                                .totalCost(p.getTotalCost())
                                .gstPercentage(p.getGstPercentage())
                                .gstAmount(p.getGstAmount())
                                .vendorName(p.getVendorName())
                                .invoiceNumber(p.getInvoiceNumber())
                                .purchaseDate(p.getPurchaseDate())
                                .purchasedByName(p.getPurchasedBy() != null ? p.getPurchasedBy().getFullName() : null)
                                .build();
        }
}
