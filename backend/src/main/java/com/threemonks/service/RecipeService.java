package com.threemonks.service;

import com.threemonks.dto.RecipeRequest;
import com.threemonks.dto.RecipeResponse;
import com.threemonks.entity.Product;
import com.threemonks.entity.RawMaterial;
import com.threemonks.entity.Recipe;
import com.threemonks.exception.ResourceNotFoundException;
import com.threemonks.repository.ProductRepository;
import com.threemonks.repository.RawMaterialRepository;
import com.threemonks.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final ProductRepository productRepository;
    private final RawMaterialRepository rawMaterialRepository;

    public List<RecipeResponse> getAllRecipes() {
        return recipeRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<RecipeResponse> getRecipesByProduct(Long productId) {
        return recipeRepository.findByProductId(productId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public RecipeResponse createRecipe(RecipeRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", request.getProductId()));
        RawMaterial rm = rawMaterialRepository.findById(request.getRawMaterialId())
                .orElseThrow(() -> new ResourceNotFoundException("RawMaterial", "id", request.getRawMaterialId()));

        Recipe recipe = Recipe.builder()
                .product(product)
                .rawMaterial(rm)
                .quantityRequired(request.getQuantityRequired())
                .build();

        return toResponse(recipeRepository.save(recipe));
    }

    @Transactional
    public RecipeResponse updateRecipe(Long id, RecipeRequest request) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe", "id", id));
        recipe.setQuantityRequired(request.getQuantityRequired());
        return toResponse(recipeRepository.save(recipe));
    }

    @Transactional
    public void deleteRecipe(Long id) {
        recipeRepository.deleteById(id);
    }

    public List<Recipe> getRecipeEntitiesByProduct(Long productId) {
        return recipeRepository.findByProductId(productId);
    }

    private RecipeResponse toResponse(Recipe recipe) {
        return RecipeResponse.builder()
                .id(recipe.getId())
                .productId(recipe.getProduct().getId())
                .productName(recipe.getProduct().getName())
                .rawMaterialId(recipe.getRawMaterial().getId())
                .rawMaterialName(recipe.getRawMaterial().getName())
                .unitType(recipe.getRawMaterial().getUnitType().name())
                .quantityRequired(recipe.getQuantityRequired())
                .build();
    }
}
