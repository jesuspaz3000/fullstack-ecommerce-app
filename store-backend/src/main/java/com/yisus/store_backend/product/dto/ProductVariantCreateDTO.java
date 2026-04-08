package com.yisus.store_backend.product.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariantCreateDTO {
    @NotNull(message = "Product ID is required")
    private Long productId;
    
    private Long colorId;
    
    private Long sizeId;
    
    @Min(value = 0, message = "Stock cannot be negative")
    private Integer stock;

    @Min(value = 1, message = "El stock mínimo debe ser al menos 1")
    private Integer minStock;

    private String sku;
}
