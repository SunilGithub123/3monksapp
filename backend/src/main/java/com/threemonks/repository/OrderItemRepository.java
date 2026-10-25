package com.threemonks.repository;

import com.threemonks.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    
    @Query("SELECT oi.product.name, SUM(oi.quantity), SUM(oi.subtotal) " +
           "FROM OrderItem oi WHERE oi.order.shop.id = :shopId " +
           "AND oi.order.orderDate BETWEEN :start AND :end " +
           "AND oi.order.status = 'COMPLETED' " +
           "GROUP BY oi.product.name ORDER BY SUM(oi.quantity) DESC")
    List<Object[]> getTopProductsByShop(@Param("shopId") Long shopId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    @Query("SELECT oi.product.name, SUM(oi.quantity), SUM(oi.subtotal) " +
           "FROM OrderItem oi WHERE oi.order.orderDate BETWEEN :start AND :end " +
           "AND oi.order.status = 'COMPLETED' " +
           "GROUP BY oi.product.name ORDER BY SUM(oi.quantity) DESC")
    List<Object[]> getTopProducts(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
