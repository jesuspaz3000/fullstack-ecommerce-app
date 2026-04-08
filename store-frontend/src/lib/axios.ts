import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

/** Rutas de auth: no deben disparar el flujo de logout en 401 “de sesión”. */
const AUTH_PATHS_NO_LOGOUT_REDIRECT = [
    "/auth/login",
    "/auth/register",
    "/auth/logout",
    "/auth/refresh-token",
] as const;

function isAuthFailureUrl(url: string | undefined): boolean {
    if (!url) return false;
    return AUTH_PATHS_NO_LOGOUT_REDIRECT.some((p) => url.includes(p));
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const url = error.config?.url ?? "";
        if (error.response?.status === 401 && !isAuthFailureUrl(url)) {
            try {
                await api.post("/auth/logout");
            } catch {
                /* ignorar: sin cookies o sesión ya inválida */
            }
            useAuthStore.getState().clearSession();
            if (typeof window !== "undefined") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
