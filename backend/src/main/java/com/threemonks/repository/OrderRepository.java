package com.threemonks.repository;

import com.threemonks.entity.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

        // Row lock so two stations finishing the same order at once can't both miss completing it
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT o FROM Order o WHERE o.id = :id")
        Optional<Order> findByIdForUpdate(@Param("id") Long id);

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

        // Pending orders that crossed the reminder age and have not been reminded yet
        @Query("SELECT o FROM Order o WHERE o.status = 'PENDING' AND o.reminderSentAt IS NULL AND o.orderDate BETWEEN :oldest AND :due")
        List<Order> findDueForReminder(@Param("oldest") LocalDateTime oldest, @Param("due") LocalDateTime due);

        // Every pending order of a branch, whatever day it was placed, oldest first, so nothing is left behind
        @Query("SELECT o FROM Order o WHERE o.shop.id = :shopId AND o.status = 'PENDING' ORDER BY o.orderDate ASC, o.tokenNumber ASC")
        List<Order> findPendingOrdersByShopId(@Param("shopId") Long shopId);

        // Orders a station handed over in the window, whatever day they were placed
        @Query("SELECT o FROM Order o WHERE o.shop.id = :shopId AND ((o.shotCompletedAt BETWEEN :start AND :end) "
                        + "OR (o.blendCompletedAt BETWEEN :start AND :end)) ORDER BY o.orderDate DESC")
        List<Order> findHandedOverByShopId(@Param("shopId") Long shopId, @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        /**
         * Day-end collection, grouped by business day, branch, payment mode and status.
         * "day" is the business date: pass {@code BusinessDay.startHour()} as startHour.
         * Columns: the order date, shop_id, shop_name, payment_mode, status,
         * order count, amount (parcel charge included).
         */
        @Query(value = """
                        SELECT CAST(o.order_date - (:startHour * INTERVAL '1 hour') AS date) AS day,
                               s.id             AS shop_id,
                               s.name           AS shop_name,
                               o.payment_mode   AS payment_mode,
                               o.status         AS status,
                               COUNT(*)         AS order_count,
                               COALESCE(SUM(o.total_amount), 0) AS amount
                        FROM orders o
                        JOIN shops s ON s.id = o.shop_id
                        WHERE o.order_date >= :start AND o.order_date <= :end
                        GROUP BY 1, 2, 3, 4, 5
                        """, nativeQuery = true)
        List<Object[]> getCollectionBreakdown(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end,
                        @Param("startHour") int startHour);

        /**
         * Units sold per day, branch and product category, cancelled orders left out.
         * Columns: the order date, shop_id, category, quantity.
         */
        @Query(value = """
                        SELECT CAST(o.order_date - (:startHour * INTERVAL '1 hour') AS date) AS day,
                               o.shop_id          AS shop_id,
                               p.category         AS category,
                               COALESCE(SUM(oi.quantity), 0) AS quantity
                        FROM order_items oi
                        JOIN orders o   ON o.id = oi.order_id
                        JOIN products p ON p.id = oi.product_id
                        WHERE o.order_date >= :start AND o.order_date <= :end
                          AND o.status <> 'CANCELLED'
                        GROUP BY 1, 2, 3
                        """, nativeQuery = true)
        List<Object[]> getUnitsSoldBreakdown(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end,
                        @Param("startHour") int startHour);

        /**
         * Sales per day, cancelled orders left out, for the dashboard trends.
         * Columns: the order date, order count, amount.
         */
        @Query(value = """
                        SELECT CAST(o.order_date - (:startHour * INTERVAL '1 hour') AS date) AS day,
                               COUNT(*)                   AS order_count,
                               COALESCE(SUM(o.total_amount), 0) AS amount
                        FROM orders o
                        WHERE o.order_date >= :start AND o.order_date <= :end
                          AND o.status <> 'CANCELLED'
                        GROUP BY 1
                        """, nativeQuery = true)
        List<Object[]> getDailyTotals(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end,
                        @Param("startHour") int startHour);

        /**
         * Units sold per day, cancelled orders left out.
         * Columns: the order date, quantity.
         */
        @Query(value = """
                        SELECT CAST(o.order_date - (:startHour * INTERVAL '1 hour') AS date) AS day,
                               COALESCE(SUM(oi.quantity), 0) AS quantity
                        FROM order_items oi
                        JOIN orders o ON o.id = oi.order_id
                        WHERE o.order_date >= :start AND o.order_date <= :end
                          AND o.status <> 'CANCELLED'
                        GROUP BY 1
                        """, nativeQuery = true)
        List<Object[]> getDailyUnits(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end,
                        @Param("startHour") int startHour);

        /**
         * Sales by hour of day across the window, cancelled orders left out, so the
         * counter rush is visible. Columns: hour (0-23), order count, amount.
         */
        @Query(value = """
                        SELECT CAST(EXTRACT(HOUR FROM o.order_date) AS int) AS hour_of_day,
                               COUNT(*)                                     AS order_count,
                               COALESCE(SUM(o.total_amount), 0)             AS amount
                        FROM orders o
                        WHERE o.order_date >= :start AND o.order_date <= :end
                          AND o.status <> 'CANCELLED'
                        GROUP BY 1
                        """, nativeQuery = true)
        List<Object[]> getHourlyTotals(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
