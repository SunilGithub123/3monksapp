package com.threemonks.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ShopResponse {
    private Long id;
    private String name;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String phone;
    private String email;
    private String gstNumber;
    private Boolean active;
}
