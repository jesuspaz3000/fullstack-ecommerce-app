package com.yisus.store_backend.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class ProductCreateDTO {

    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 255, message = "Name must be between 3 and 255 characters")
    private String name;

    @NotNull(message = "Purchase price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Purchase price must be greater than 0")
    private BigDecimal purchasePrice;

    @NotNull(message = "Sale price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Sale price must be greater than 0")
    private BigDecimal salePrice;

    private BigDecimal discountPercentage;
    private LocalDateTime discountStart;
    private LocalDateTime discountEnd;

    private Boolean isFeatured = false;

    @NotNull(message = "Category is required")
    private Long categoryId;


    private Integer minStock = 5;
}
