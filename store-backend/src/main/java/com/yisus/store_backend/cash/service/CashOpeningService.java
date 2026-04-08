package com.yisus.store_backend.cash.service;

import com.yisus.store_backend.cash.dto.CashCloseRequestDTO;
import com.yisus.store_backend.cash.dto.CashCloseResponseDTO;
import com.yisus.store_backend.cash.dto.CashOpenRequestDTO;
import com.yisus.store_backend.cash.dto.CashSessionHistoryDTO;
import com.yisus.store_backend.cash.dto.CashStatusResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface CashOpeningService {

    CashStatusResponseDTO openCashRegister(CashOpenRequestDTO dto);

    CashStatusResponseDTO getCurrentCashStatus(Long cashRegisterId);

    CashCloseResponseDTO closeCashRegister(CashCloseRequestDTO dto);

    /** {@code cashRegisterId} null = todas las cajas. */
    List<CashSessionHistoryDTO> getSessionHistory(Long cashRegisterId);

    /**
     * Historial paginado. {@code cashRegisterId} null = todas las cajas.
     * Filtros opcionales: id de sesión, fechas de apertura (inclusive), texto en nombre de cliente (envío) o vendedor (usuario del pedido).
     */
    Page<CashSessionHistoryDTO> getSessionHistoryPaginated(
            Long cashRegisterId,
            Long sessionId,
            LocalDate openedFrom,
            LocalDate openedTo,
            String customer,
            String seller,
            Pageable pageable);
}
