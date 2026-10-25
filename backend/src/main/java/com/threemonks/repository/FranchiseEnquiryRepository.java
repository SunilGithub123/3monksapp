package com.threemonks.repository;

import com.threemonks.entity.FranchiseEnquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FranchiseEnquiryRepository extends JpaRepository<FranchiseEnquiry, Long> {
    List<FranchiseEnquiry> findAllByOrderByCreatedAtDesc();
}
