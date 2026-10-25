package com.threemonks.repository;

import com.threemonks.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    List<Recipe> findByProductId(Long productId);
    List<Recipe> findByRawMaterialId(Long rawMaterialId);
    void deleteByProductId(Long productId);
}
