package com.yisus.store_backend.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemDTO {
    private Long id;
    private Long orderId;
    private Long productVariantId;
    private String productName;
    private String colorName;
    private String sizeName;
    /** Ruta relativa de imagen (ej. /uploads/products/...), misma convención que en productos. */
    private String imageUrl;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
