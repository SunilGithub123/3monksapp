package com.threemonks.repository;

import com.threemonks.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByUserId(Long userId);
    List<Employee> findByShopId(Long shopId);
    List<Employee> findByActiveTrue();

    @Query("SELECT e FROM Employee e WHERE e.shop.id = :shopId AND e.active = true")
    List<Employee> findActiveByShopId(@Param("shopId") Long shopId);

    boolean existsByUserId(Long userId);
}
