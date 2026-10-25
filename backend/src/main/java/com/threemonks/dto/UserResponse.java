package com.threemonks.dto;

import com.threemonks.enums.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private Role role;
    private Long shopId;
    private String shopName;
    private Boolean active;
}
