package com.threemonks.dto;

import com.threemonks.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class LoginResponse {
    private String token;
    private String username;
    private String fullName;
    private String email;
    private Role role;
    private Long shopId;
    private String shopName;
}
