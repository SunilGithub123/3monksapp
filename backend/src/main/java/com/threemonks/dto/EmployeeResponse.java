package com.threemonks.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class EmployeeResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String fullName;
    private String email;
    private String phone;
    private String role;
    private Long shopId;
    private String shopName;
    private BigDecimal salary;
    private BigDecimal incentivePercentage;
    private Boolean active;
}
