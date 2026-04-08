package com.yisus.store_backend.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductReportRowDTO {
    private Long id;
    private String name;
    private String categoryName;
    private BigDecimal salePrice;
    private int variantCount;
    private int totalStock;
    private Boolean isActive;
}
