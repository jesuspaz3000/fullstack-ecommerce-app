import { ApiService } from "@/shared/services/api.service";
import type { Sale } from "../types/salesTypes";
import {
    CashCloseRequest,
    CashCloseResult,
    CashGlobalSummary,
    CashOpenRequest,
    CashOutflow,
    CashOutflowRequest,
    CashRegisterBalance,
    CashRegisterRow,
    CashSessionHistory,
    CashStatus,
    OutflowReason,
    PaginatedResponse,
} from "../types/cashTypes";

export const CashService = {
    listRegisters: async (): Promise<CashRegisterRow[]> => {
        const res = await ApiService.get<CashRegisterRow[]>("/cash/registers");
        return res.data;
    },

    createRegister: async (name: string): Promise<CashRegisterRow> => {
        const res = await ApiService.post<CashRegisterRow>("/cash/registers", { name });
        return res.data;
    },

    getRegisterBalance: async (cashRegisterId: number): Promise<CashRegisterBalance> => {
        const res = await ApiService.get<CashRegisterBalance>("/cash/balance", {
            params: { cashRegisterId },
        });
        return res.data;
    },

    getStatus: async (cashRegisterId: number): Promise<CashStatus> => {
        const res = await ApiService.get<CashStatus>("/cash/opening/status", {
            params: { cashRegisterId },
        });
        return res.data;
    },

    open: async (dto: CashOpenRequest): Promise<CashStatus> => {
        const res = await ApiService.post<CashStatus>("/cash/opening/open", dto);
        return res.data;
    },

    close: async (dto: CashCloseRequest): Promise<CashCloseResult> => {
        const res = await ApiService.post<CashCloseResult>("/cash/opening/close", dto);
        return res.data;
    },

    getOutflowReasons: async (): Promise<OutflowReason[]> => {
        const res = await ApiService.get<OutflowReason[]>("/cash/outflow-reasons");
        return res.data;
    },

    createOutflow: async (dto: CashOutflowRequest): Promise<void> => {
        await ApiService.post("/cash/outflows", dto);
    },

    /** Historial paginado (limit/offset obligatorios). La caja ya se filtra con cashRegisterId. */
    getHistoryPaginated: async (params: {
        cashRegisterId?: number;
        limit: number;
        offset: number;
        openedFrom?: string;
        openedTo?: string;
        customer?: string;
        seller?: string;
    }): Promise<PaginatedResponse<CashSessionHistory>> => {
        const res = await ApiService.get<PaginatedResponse<CashSessionHistory>>("/cash/opening/history", {
            params: {
                cashRegisterId: params.cashRegisterId,
                limit: params.limit,
                offset: params.offset,
                openedFrom: params.openedFrom?.trim() || undefined,
                openedTo: params.openedTo?.trim() || undefined,
                customer: params.customer?.trim() || undefined,
                seller: params.seller?.trim() || undefined,
            },
        });
        return res.data;
    },

    getSalesBySession: async (sessionId: number): Promise<Sale[]> => {
        const res = await ApiService.get<Sale[]>("/orders/by-session", {
            params: { sessionId },
        });
        return res.data;
    },

    getOutflowsBySession: async (sessionId: number): Promise<CashOutflow[]> => {
        const res = await ApiService.get<CashOutflow[]>("/cash/outflows/by-session", {
            params: { sessionId },
        });
        return res.data;
    },

    openReceipt: async (orderId: number): Promise<void> => {
        const res = await ApiService.get<Blob>(`/orders/${orderId}/receipt`, {
            responseType: "blob",
        });
        const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
    },

    getGlobalSummary: async (): Promise<CashGlobalSummary> => {
        const startDate = new Date("2000-01-01T00:00:00.000Z").toISOString();
        const endDate = new Date().toISOString();
        const res = await ApiService.get<CashGlobalSummary>("/cash/reports/summary", {
            params: { startDate, endDate },
        });
        return res.data;
    },
};
