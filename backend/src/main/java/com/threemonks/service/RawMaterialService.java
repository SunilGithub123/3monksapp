package com.threemonks.service;

import com.threemonks.dto.RawMaterialRequest;
import com.threemonks.dto.RawMaterialResponse;
import com.threemonks.entity.RawMaterial;
import com.threemonks.exception.ResourceNotFoundException;
import com.threemonks.repository.RawMaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RawMaterialService {

    private final RawMaterialRepository rawMaterialRepository;

    public List<RawMaterialResponse> getAllRawMaterials() {
        return rawMaterialRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<RawMaterialResponse> getActiveRawMaterials() {
        return rawMaterialRepository.findByActiveTrue().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public RawMaterialResponse getRawMaterialById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public RawMaterialResponse createRawMaterial(RawMaterialRequest request) {
        RawMaterial rm = RawMaterial.builder()
                .name(request.getName())
                .unitType(request.getUnitType())
                .costPerUnit(request.getCostPerUnit())
                .vendorName(request.getVendorName())
                .vendorContact(request.getVendorContact())
                .expiryDate(request.getExpiryDate())
                .reorderLevel(request.getReorderLevel())
                .active(true)
                .build();
        return toResponse(rawMaterialRepository.save(rm));
    }

    @Transactional
    public RawMaterialResponse updateRawMaterial(Long id, RawMaterialRequest request) {
        RawMaterial rm = findById(id);
        rm.setName(request.getName());
        rm.setUnitType(request.getUnitType());
        rm.setCostPerUnit(request.getCostPerUnit());
        rm.setVendorName(request.getVendorName());
        rm.setVendorContact(request.getVendorContact());
        rm.setExpiryDate(request.getExpiryDate());
        rm.setReorderLevel(request.getReorderLevel());
        return toResponse(rawMaterialRepository.save(rm));
    }

    @Transactional
    public void toggleRawMaterialStatus(Long id) {
        RawMaterial rm = findById(id);
        rm.setActive(!rm.getActive());
        rawMaterialRepository.save(rm);
    }

    private RawMaterial findById(Long id) {
        return rawMaterialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RawMaterial", "id", id));
    }

    private RawMaterialResponse toResponse(RawMaterial rm) {
        return RawMaterialResponse.builder()
                .id(rm.getId())
                .name(rm.getName())
                .unitType(rm.getUnitType())
                .costPerUnit(rm.getCostPerUnit())
                .vendorName(rm.getVendorName())
                .vendorContact(rm.getVendorContact())
                .expiryDate(rm.getExpiryDate())
                .reorderLevel(rm.getReorderLevel())
                .lastPurchaseDate(rm.getLastPurchaseDate())
                .active(rm.getActive())
                .build();
    }
}
