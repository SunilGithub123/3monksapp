package com.threemonks.repository;

import com.threemonks.entity.StockHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StockHistoryRepository extends JpaRepository<StockHistory, Long> {
    List<StockHistory> findByShopIdOrderByCreatedAtDesc(Long shopId);
    List<StockHistory> findByShopIdAndCreatedAtBetween(Long shopId, LocalDateTime start, LocalDateTime end);

    @Query("SELECT sh.rawMaterial.name, sh.rawMaterial.unitType, SUM(sh.quantityChange) " +
           "FROM StockHistory sh WHERE sh.changeType = :changeType AND sh.createdAt BETWEEN :start AND :end " +
           "GROUP BY sh.rawMaterial.name, sh.rawMaterial.unitType")
    List<Object[]> getMaterialUsageByType(@Param("changeType") String changeType, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
