package com.threemonks.service;

import com.threemonks.dto.UserRequest;
import com.threemonks.dto.UserResponse;
import com.threemonks.entity.Shop;
import com.threemonks.entity.User;
import com.threemonks.enums.Role;
import com.threemonks.exception.BadRequestException;
import com.threemonks.exception.ResourceNotFoundException;
import com.threemonks.exception.UnauthorizedException;
import com.threemonks.repository.ShopRepository;
import com.threemonks.repository.UserRepository;
import com.threemonks.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<UserResponse> getUsersByShop(Long shopId) {
        return userRepository.findByShopId(shopId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public UserResponse getUserById(Long id) {
        return toResponse(findUserById(id));
    }

    @Transactional
    public UserResponse createUser(UserRequest request, UserPrincipal currentUser) {
        // Validate unique constraints
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        // Validate role-based user creation
        validateUserCreation(request, currentUser);

        Shop shop = null;
        if (request.getShopId() != null) {
            shop = shopRepository.findById(request.getShopId())
                    .orElseThrow(() -> new ResourceNotFoundException("Shop", "id", request.getShopId()));
        }

        // Non-admin users must have a shop
        if (request.getRole() != Role.SUPER_ADMIN && shop == null) {
            throw new BadRequestException("Shop is required for non-admin users");
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(request.getRole())
                .shop(shop)
                .active(true)
                .build();

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateUser(Long id, UserRequest request) {
        User user = findUserById(id);

        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getShopId() != null) {
            Shop shop = shopRepository.findById(request.getShopId())
                    .orElseThrow(() -> new ResourceNotFoundException("Shop", "id", request.getShopId()));
            user.setShop(shop);
        }

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void toggleUserStatus(Long id) {
        User user = findUserById(id);
        user.setActive(!user.getActive());
        userRepository.save(user);
    }

    private void validateUserCreation(UserRequest request, UserPrincipal currentUser) {
        if (currentUser.getRole() == Role.SHOP_MANAGER) {
            // Shop manager can only create operators in their own shop
            if (request.getRole() != Role.SHOP_OPERATOR) {
                throw new UnauthorizedException("Shop managers can only create shop operators");
            }
            if (!currentUser.getShopId().equals(request.getShopId())) {
                throw new UnauthorizedException("Cannot create users for other shops");
            }
        }
    }

    private User findUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .shopId(user.getShop() != null ? user.getShop().getId() : null)
                .shopName(user.getShop() != null ? user.getShop().getName() : null)
                .active(user.getActive())
                .build();
    }
}
