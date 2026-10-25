package com.threemonks.repository;

import com.threemonks.entity.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    List<Purchase> findByShopIdOrderByCreatedAtDesc(Long shopId);
    List<Purchase> findByShopIdAndPurchaseDateBetween(Long shopId, LocalDate start, LocalDate end);
    
    @Query("SELECT SUM(p.totalCost) FROM Purchase p WHERE p.shop.id = :shopId AND p.purchaseDate BETWEEN :start AND :end")
    BigDecimal getTotalCostByShopAndDateRange(@Param("shopId") Long shopId, @Param("start") LocalDate start, @Param("end") LocalDate end);
    
    @Query("SELECT SUM(p.totalCost) FROM Purchase p WHERE p.purchaseDate BETWEEN :start AND :end")
    BigDecimal getTotalCostByDateRange(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT p.vendorName, COUNT(p), SUM(p.quantity), SUM(p.totalCost) FROM Purchase p WHERE p.purchaseDate BETWEEN :start AND :end GROUP BY p.vendorName ORDER BY SUM(p.totalCost) DESC")
    List<Object[]> getVendorWisePurchases(@Param("start") LocalDate start, @Param("end") LocalDate end);

    List<Purchase> findByPurchaseDateBetween(LocalDate start, LocalDate end);
}
