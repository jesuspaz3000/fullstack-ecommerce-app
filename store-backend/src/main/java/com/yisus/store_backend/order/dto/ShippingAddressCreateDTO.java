package com.yisus.store_backend.order.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingAddressCreateDTO {
    @NotBlank(message = "Full name is required")
    private String fullName;

    /** Opcional (punto de venta: solo nombre del cliente). */
    private String address;

    private String city;

    private String phone;
}
