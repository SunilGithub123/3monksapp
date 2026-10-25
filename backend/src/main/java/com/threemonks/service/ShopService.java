package com.threemonks.service;

import com.threemonks.dto.ShopRequest;
import com.threemonks.dto.ShopResponse;
import com.threemonks.entity.Shop;
import com.threemonks.exception.ResourceNotFoundException;
import com.threemonks.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShopService {

    private final ShopRepository shopRepository;

    public List<ShopResponse> getAllShops() {
        return shopRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ShopResponse> getActiveShops() {
        return shopRepository.findByActiveTrue().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ShopResponse getShopById(Long id) {
        return toResponse(findShopById(id));
    }

    @Transactional
    public ShopResponse createShop(ShopRequest request) {
        Shop shop = Shop.builder()
                .name(request.getName())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .pincode(request.getPincode())
                .phone(request.getPhone())
                .email(request.getEmail())
                .gstNumber(request.getGstNumber())
                .active(true)
                .build();
        return toResponse(shopRepository.save(shop));
    }

    @Transactional
    public ShopResponse updateShop(Long id, ShopRequest request) {
        Shop shop = findShopById(id);
        shop.setName(request.getName());
        shop.setAddress(request.getAddress());
        shop.setCity(request.getCity());
        shop.setState(request.getState());
        shop.setPincode(request.getPincode());
        shop.setPhone(request.getPhone());
        shop.setEmail(request.getEmail());
        shop.setGstNumber(request.getGstNumber());
        return toResponse(shopRepository.save(shop));
    }

    @Transactional
    public void toggleShopStatus(Long id) {
        Shop shop = findShopById(id);
        shop.setActive(!shop.getActive());
        shopRepository.save(shop);
    }

    public Shop findShopById(Long id) {
        return shopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shop", "id", id));
    }

    private ShopResponse toResponse(Shop shop) {
        return ShopResponse.builder()
                .id(shop.getId())
                .name(shop.getName())
                .address(shop.getAddress())
                .city(shop.getCity())
                .state(shop.getState())
                .pincode(shop.getPincode())
                .phone(shop.getPhone())
                .email(shop.getEmail())
                .gstNumber(shop.getGstNumber())
                .active(shop.getActive())
                .build();
    }
}
