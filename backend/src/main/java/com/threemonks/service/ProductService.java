package com.threemonks.service;

import com.threemonks.dto.ProductRequest;
import com.threemonks.dto.ProductResponse;
import com.threemonks.dto.FruitResponse;
import com.threemonks.entity.Fruit;
import com.threemonks.entity.Product;
import com.threemonks.enums.ProductCategory;
import com.threemonks.exception.BadRequestException;
import com.threemonks.exception.ResourceNotFoundException;
import com.threemonks.repository.FruitRepository;
import com.threemonks.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final FruitRepository fruitRepository;

    private static final List<String> ALLOWED_IMAGE_TYPES = List.of(
            "image/jpeg", "image/png", "image/gif", "image/webp");

    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ProductResponse> getActiveProducts() {
        return productRepository.findByActiveTrue().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ProductResponse> getProductsByCategory(ProductCategory category) {
        return productRepository.findByCategoryAndActiveTrue(category).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ProductResponse getProductById(Long id) {
        return toResponse(findProductById(id));
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        // Validate fruit rules per category
        if (request.getCategory() == ProductCategory.CURATED_BLEND && request.getFruitIds() != null
                && request.getFruitIds().size() > 2) {
            throw new BadRequestException("Curated Blend can have maximum 2 fruits");
        }
        if (request.getCategory() == ProductCategory.CREAMY_BLEND && request.getFruitIds() != null
                && request.getFruitIds().size() > 1) {
            throw new BadRequestException("Creamy Blend can have maximum 1 fruit");
        }

        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .category(request.getCategory())
                .price(request.getPrice())
                .active(true)
                .build();

        if (request.getFruitIds() != null && !request.getFruitIds().isEmpty()) {
            List<Fruit> fruits = fruitRepository.findAllById(request.getFruitIds());
            product.setFruits(fruits);
        }

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = findProductById(id);

        if (request.getCategory() == ProductCategory.CURATED_BLEND && request.getFruitIds() != null
                && request.getFruitIds().size() > 2) {
            throw new BadRequestException("Curated Blend can have maximum 2 fruits");
        }
        if (request.getCategory() == ProductCategory.CREAMY_BLEND && request.getFruitIds() != null
                && request.getFruitIds().size() > 1) {
            throw new BadRequestException("Creamy Blend can have maximum 1 fruit");
        }

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setImageUrl(request.getImageUrl());
        product.setCategory(request.getCategory());
        product.setPrice(request.getPrice());

        if (request.getFruitIds() != null) {
            List<Fruit> fruits = fruitRepository.findAllById(request.getFruitIds());
            product.setFruits(fruits);
        }

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public void uploadProductImage(Long id, MultipartFile file) {
        Product product = findProductById(id);

        if (file.isEmpty()) {
            throw new BadRequestException("Image file is empty");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("Image size must not exceed 5MB");
        }
        if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("Only JPEG, PNG, GIF, and WebP images are allowed");
        }

        try {
            product.setImage(file.getBytes());
            product.setImageContentType(file.getContentType());
            productRepository.save(product);
        } catch (IOException e) {
            throw new BadRequestException("Failed to process image file");
        }
    }

    @Transactional
    public void deleteProductImage(Long id) {
        Product product = findProductById(id);
        product.setImage(null);
        product.setImageContentType(null);
        productRepository.save(product);
    }

    @Transactional
    public void toggleProductStatus(Long id) {
        Product product = findProductById(id);
        product.setActive(!product.getActive());
        productRepository.save(product);
    }

    public Product findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
    }

    private ProductResponse toResponse(Product product) {
        List<FruitResponse> fruitResponses = product.getFruits().stream()
                .map(f -> FruitResponse.builder()
                        .id(f.getId())
                        .name(f.getName())
                        .imageUrl(f.getImageUrl())
                        .active(f.getActive())
                        .build())
                .collect(Collectors.toList());

        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .imageUrl(product.getImageUrl())
                .hasImage(product.getImage() != null && product.getImage().length > 0)
                .category(product.getCategory())
                .price(product.getPrice())
                .fruits(fruitResponses)
                .active(product.getActive())
                .build();
    }
}
