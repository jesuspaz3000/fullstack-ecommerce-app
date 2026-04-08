package com.yisus.store_backend.report.service;

import com.yisus.store_backend.cash.dto.CashSessionHistoryDTO;
import com.yisus.store_backend.report.dto.ProductReportRowDTO;

import java.util.List;

public interface ReportService {

    /** Datos JSON para la tabla de vista previa. */
    List<CashSessionHistoryDTO> getCashSessionsList(
            Long cashRegisterId, String startDate, String endDate, String status);

    /** Datos JSON para la tabla de vista previa. */
    List<ProductReportRowDTO> getProductsList(
            Long categoryId, String status, String stockFilter);

    /** PDF A4 con el historial de sesiones de caja. */
    byte[] generateCashSessionsPdf(
            Long cashRegisterId, String startDate, String endDate, String status);

    /** PDF A4 con el listado de productos y stock. */
    byte[] generateProductsPdf(
            Long categoryId, String status, String stockFilter);
}
