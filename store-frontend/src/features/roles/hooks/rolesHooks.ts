import { useState, useEffect, useCallback } from "react";
import { RoleService } from "../services/roles.service";
import { Role, Permission, PaginatedResponse, Params, RoleCreate, RoleUpdate } from "../types/rolesTypes";

// ─── useRoles ────────────────────────────────────────────────────────────────

export function useRoles({ limit, offset, search }: Params = {}) {
    const [data, setData]       = useState<PaginatedResponse<Role> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await RoleService.getRoles({ limit, offset, search });
            setData(result);
        } catch (err) {
            console.error("[useRoles]", err);
            setError("Error al cargar los roles.");
        } finally {
            setLoading(false);
        }
    }, [limit, offset, search]);

    const updateRow = useCallback((id: number, changes: Partial<Role>) => {
        setData((prev) => {
            if (!prev) return prev;
            return { ...prev, results: prev.results.map((r) => r.id === id ? { ...r, ...changes } : r) };
        });
    }, []);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, refetch: load, updateRow };
}

// ─── useRole ─────────────────────────────────────────────────────────────────

export function useRole(id: number) {
    const [data, setData]       = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const load = useCallback(async () => {
        if (id <= 0) return;
        setLoading(true);
        setError(null);
        try {
            const result = await RoleService.getRole(id);
            setData(result);
        } catch (err) {
            console.error("[useRole]", err);
            setError("Error al cargar el rol.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, refetch: load };
}

// ─── useCreateRole ────────────────────────────────────────────────────────────

export function useCreateRole() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (payload: RoleCreate): Promise<Role | null> => {
        setLoading(true);
        setError(null);
        try {
            return await RoleService.createRole(payload);
        } catch (err) {
            console.error("[useCreateRole]", err);
            setError("Error al crear el rol.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

// ─── useUpdateRole ────────────────────────────────────────────────────────────

export function useUpdateRole() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (id: number, payload: RoleUpdate): Promise<Role | null> => {
        setLoading(true);
        setError(null);
        try {
            return await RoleService.updateRole(id, payload);
        } catch (err) {
            console.error("[useUpdateRole]", err);
            setError("Error al actualizar el rol.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

// ─── useStatusRole ────────────────────────────────────────────────────────────

export function useStatusRole() {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const execute = useCallback(async (id: number, isActive: boolean): Promise<Role | null> => {
        setLoading(true);
        setError(null);
        try {
            return await RoleService.statusRole(id, isActive);
        } catch (err) {
            console.error("[useStatusRole]", err);
            setError("Error al cambiar el estado del rol.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error };
}

// ─── usePermissions ───────────────────────────────────────────────────────────

interface UsePermissionsParams extends Params {
    enabled?: boolean;
}

export function usePermissions({ limit, offset, search, enabled = true }: UsePermissionsParams = {}) {
    const [data, setData]       = useState<PaginatedResponse<Permission> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        setError(null);
        try {
            const result = await RoleService.getPermissions({ limit, offset, search });
            setData(result);
        } catch (err) {
            console.error("[usePermissions]", err);
            setError("Error al cargar los permisos.");
        } finally {
            setLoading(false);
        }
    }, [limit, offset, search, enabled]);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, refetch: load };
}

// ─── useAllPermissions ────────────────────────────────────────────────────────

export function useAllPermissions(enabled = true) {
    const [data, setData]       = useState<Permission[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        setError(null);
        try {
            const result = await RoleService.getAllPermissions();
            setData(result);
        } catch (err) {
            console.error("[useAllPermissions]", err);
            setError("Error al cargar los permisos.");
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error };
}

