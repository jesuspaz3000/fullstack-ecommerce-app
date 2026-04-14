import { isAxiosError } from "axios";
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

    /**
     * Abre el PDF del recibo en {@code targetWindow}.
     * Esa ventana debe abrirse con {@code window.open("about:blank", "_blank")} en el mismo clic del usuario;
     * si se llama a {@code window.open} después de un {@code await}, muchos navegadores bloquean la pestaña
     * o muestran el visor en gris con un blob vacío/inválido.
     */
    openReceipt: async (orderId: number, targetWindow: Window): Promise<void> => {
        try {
            const res = await ApiService.get<Blob>(`/orders/${orderId}/receipt`, {
                responseType: "blob",
            });
            const blob = res.data as Blob;
            const ct = (res.headers["content-type"] ?? "").toLowerCase();

            if (!ct.includes("application/pdf") || blob.size < 64) {
                const text = await blob.text();
                if (!targetWindow.closed) {
                    targetWindow.close();
                }
                let msg = "El servidor no devolvió un PDF válido.";
                try {
                    const j = JSON.parse(text) as { message?: string };
                    if (typeof j.message === "string" && j.message.length > 0) {
                        msg = j.message;
                    }
                } catch {
                    if (text.length > 0 && text.length < 400) {
                        msg = text;
                    }
                }
                throw new Error(msg);
            }

            const url = URL.createObjectURL(blob);
            const fileName = `recibo-${orderId}.pdf`;

            targetWindow.location.assign(url);

            // Copia en Descargas: el archivo no "caduca" como la pestaña blob (F5 o más tarde → ERR_FILE_NOT_FOUND).
            try {
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.style.display = "none";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch {
                /* algunos entornos restringen descarga programática */
            }

            // No revocar el blob aquí: si se hace URL.revokeObjectURL a los pocos minutos, al recargar la pestaña del
            // PDF o abrir el mismo blob: más tarde aparece ERR_FILE_NOT_FOUND. La URL se libera al cerrar la pestaña del panel.
        } catch (err) {
            if (!targetWindow.closed) {
                targetWindow.close();
            }
            if (isAxiosError(err) && err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                let msg = "No se pudo generar el recibo.";
                try {
                    const j = JSON.parse(text) as { message?: string };
                    if (typeof j.message === "string" && j.message.length > 0) {
                        msg = j.message;
                    }
                } catch {
                    /* ignore */
                }
                if (err.response.status === 401 || err.response.status === 403) {
                    msg = "Sesión expirada o sin permiso para ver el recibo.";
                }
                throw new Error(msg);
            }
            throw err;
        }
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
