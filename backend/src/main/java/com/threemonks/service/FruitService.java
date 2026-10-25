package com.threemonks.service;

import com.threemonks.dto.FruitRequest;
import com.threemonks.dto.FruitResponse;
import com.threemonks.entity.Fruit;
import com.threemonks.exception.ResourceNotFoundException;
import com.threemonks.repository.FruitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FruitService {

    private final FruitRepository fruitRepository;

    public List<FruitResponse> getAllFruits() {
        return fruitRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<FruitResponse> getActiveFruits() {
        return fruitRepository.findByActiveTrue().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public FruitResponse getFruitById(Long id) {
        return toResponse(findFruitById(id));
    }

    @Transactional
    public FruitResponse createFruit(FruitRequest request) {
        // Auto-assign next available short code
        Integer maxCode = fruitRepository.findAll().stream()
                .map(Fruit::getShortCode)
                .filter(c -> c != null)
                .max(Integer::compareTo)
                .orElse(0);
        Fruit fruit = Fruit.builder()
                .name(request.getName())
                .imageUrl(request.getImageUrl())
                .shortCode(maxCode + 1)
                .active(true)
                .eligibleForShot(request.getEligibleForShot() == null ? true : request.getEligibleForShot())
                .eligibleForBlend(request.getEligibleForBlend() == null ? true : request.getEligibleForBlend())
                .build();
        return toResponse(fruitRepository.save(fruit));
    }

    @Transactional
    public FruitResponse updateFruit(Long id, FruitRequest request) {
        Fruit fruit = findFruitById(id);
        fruit.setName(request.getName());
        fruit.setImageUrl(request.getImageUrl());
        if (request.getEligibleForShot() != null) {
            fruit.setEligibleForShot(request.getEligibleForShot());
        }
        if (request.getEligibleForBlend() != null) {
            fruit.setEligibleForBlend(request.getEligibleForBlend());
        }
        return toResponse(fruitRepository.save(fruit));
    }

    @Transactional
    public void toggleFruitStatus(Long id) {
        Fruit fruit = findFruitById(id);
        fruit.setActive(!fruit.getActive());
        fruitRepository.save(fruit);
    }

    public Fruit findFruitById(Long id) {
        return fruitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fruit", "id", id));
    }

    private FruitResponse toResponse(Fruit fruit) {
        return FruitResponse.builder()
                .id(fruit.getId())
                .name(fruit.getName())
                .imageUrl(fruit.getImageUrl())
                .shortCode(fruit.getShortCode())
                .active(fruit.getActive())
                .eligibleForShot(fruit.getEligibleForShot())
                .eligibleForBlend(fruit.getEligibleForBlend())
                .build();
    }
}
