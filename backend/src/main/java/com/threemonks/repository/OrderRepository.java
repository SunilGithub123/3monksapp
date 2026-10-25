package com.threemonks.repository;

import com.threemonks.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

        Optional<Order> findByOrderNumber(String orderNumber);

        List<Order> findByShopIdOrderByCreatedAtDesc(Long shopId);

        List<Order> findAllByOrderByCreatedAtDesc();

        List<Order> findByShopIdAndOrderDateBetween(Long shopId, LocalDateTime start, LocalDateTime end);

        List<Order> findByOrderDateBetween(LocalDateTime start, LocalDateTime end);

        @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.shop.id = :shopId AND o.orderDate BETWEEN :start AND :end AND o.status = 'COMPLETED'")
        BigDecimal getTotalSalesByShopAndDateRange(@Param("shopId") Long shopId, @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.orderDate BETWEEN :start AND :end AND o.status = 'COMPLETED'")
        BigDecimal getTotalSalesByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        @Query("SELECT COUNT(o) FROM Order o WHERE o.shop.id = :shopId AND o.orderDate BETWEEN :start AND :end AND o.status = 'COMPLETED'")
        Long getOrderCountByShopAndDateRange(@Param("shopId") Long shopId, @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("SELECT COUNT(o) FROM Order o WHERE o.orderDate BETWEEN :start AND :end AND o.status = 'COMPLETED'")
        Long getOrderCountByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        List<Order> findByCreatedByIdOrderByCreatedAtDesc(Long userId);

        @Query("SELECT o FROM Order o WHERE o.shop.id = :shopId AND o.orderDate BETWEEN :startOfDay AND :endOfDay ORDER BY o.createdAt DESC")
        List<Order> findTodayOrdersByShopId(@Param("shopId") Long shopId, @Param("startOfDay") LocalDateTime startOfDay,
                        @Param("endOfDay") LocalDateTime endOfDay);

        @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.createdBy.id = :userId AND o.orderDate BETWEEN :start AND :end AND o.status = 'COMPLETED'")
        BigDecimal getTotalSalesByUserAndDateRange(@Param("userId") Long userId, @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("SELECT COUNT(o) FROM Order o WHERE o.createdBy.id = :userId AND o.orderDate BETWEEN :start AND :end AND o.status = 'COMPLETED'")
        Long getOrderCountByUserAndDateRange(@Param("userId") Long userId, @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("SELECT COALESCE(MAX(o.tokenNumber), 0) FROM Order o WHERE o.shop.id = :shopId AND o.orderDate BETWEEN :start AND :end")
        Integer findMaxTokenNumberByShopAndDate(@Param("shopId") Long shopId, @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("SELECT o FROM Order o WHERE o.orderDate BETWEEN :start AND :end AND o.status = 'COMPLETED' ORDER BY o.orderDate DESC")
        List<Order> findCompletedOrdersByDateRange(@Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("SELECT o FROM Order o WHERE o.shop.id = :shopId AND o.orderDate BETWEEN :start AND :end AND o.status = 'PENDING' ORDER BY o.tokenNumber ASC")
        List<Order> findTodayPendingOrdersByShopId(@Param("shopId") Long shopId, @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);
}
