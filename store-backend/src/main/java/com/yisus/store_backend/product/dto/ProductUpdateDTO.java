package com.yisus.store_backend.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
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
public class ProductUpdateDTO {

    @Size(min = 3, max = 255, message = "Name must be between 3 and 255 characters")
    private String name;

    @DecimalMin(value = "0.0", inclusive = false, message = "Purchase price must be greater than 0")
    private BigDecimal purchasePrice;

    @DecimalMin(value = "0.0", inclusive = false, message = "Sale price must be greater than 0")
    private BigDecimal salePrice;

    private BigDecimal discountPercentage;
    private LocalDateTime discountStart;
    private LocalDateTime discountEnd;
    private Boolean isFeatured;
    private Long categoryId;
    private Integer minStock;
}
