'use client';

import { useState } from "react";
import {
    Alert,
    Box,
    Chip,
    Grid,
    IconButton,
    Paper,
    Skeleton,
    Snackbar,
    Switch,
    TablePagination,
    Tooltip,
    Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DataTable, { TableColumn } from "@/shared/components/DataTable";
import { compactTablePaginationSx } from "@/shared/mui/compactTablePaginationSx";
import { ListLayoutMeasurePlaceholder } from "@/shared/components/ListLayoutMeasurePlaceholder";
import { useNarrowLayoutMd } from "@/shared/hooks/useNarrowLayoutMd";
import { useRoles, useStatusRole } from "../hooks/rolesHooks";
import { Role } from "../types/rolesTypes";
import CreateRole from "./CreateRole";
import EditRole from "./EditRole";

interface RoleTabProps {
    search: string;
    createOpen: boolean;
    onCreateClose: () => void;
}

interface SnackbarState {
    open: boolean;
    message: string;
    severity: "success" | "error";
}

function RoleMobileCard({
    role,
    onEdit,
    onToggleStatus,
}: {
    role: Role;
    onEdit: (r: Role) => void;
    onToggleStatus: (r: Role) => void;
}) {
    const theme = useTheme();
    const accent = theme.palette.primary.main;
    const chipHeight = 28;
    const chipRadius = 2;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 2,
                height: "100%",
                bgcolor: (t) =>
                    t.palette.mode === "dark" ? alpha(t.palette.background.paper, 0.55) : t.palette.background.paper,
                borderColor: (t) => alpha(t.palette.divider, 0.2),
            }}
        >
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box sx={{ flex: 1, minWidth: 0, pt: 0.25, pr: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                        {role.name}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.35, wordBreak: "break-word", fontSize: "0.8rem" }}
                    >
                        {role.description || "—"}
                    </Typography>
                </Box>
                {role.isActive ? (
                    <Tooltip title="Editar">
                        <IconButton
                            size="small"
                            onClick={() => onEdit(role)}
                            aria-label="Editar rol"
                            sx={{ color: alpha(accent, 0.95), mt: -0.5, mr: -0.75, flexShrink: 0 }}
                        >
                            <EditRoundedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                ) : (
                    <Box sx={{ width: 36, flexShrink: 0 }} />
                )}
            </Box>

            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    mt: 2,
                    pt: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Chip
                    label={`PERMISOS: ${role.permissions.length}`}
                    size="small"
                    variant="filled"
                    sx={{
                        height: chipHeight,
                        borderRadius: chipRadius,
                        fontWeight: 700,
                        fontSize: "0.6875rem",
                        letterSpacing: 0.35,
                        bgcolor: (t) =>
                            t.palette.mode === "dark"
                                ? t.palette.background.tableHeader
                                : alpha(t.palette.grey[200], 1),
                        color: (t) =>
                            t.palette.mode === "dark"
                                ? "#ECE8DD"
                                : t.palette.text.primary,
                        boxShadow: "none",
                        "& .MuiChip-label": { px: 1.5, py: 0 },
                    }}
                />
                <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <Tooltip title={role.isActive ? "Desactivar" : "Activar"}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                cursor: "pointer",
                            }}
                            onClick={() => onToggleStatus(role)}
                        >
                            <Switch
                                checked={role.isActive}
                                size="small"
                                color="success"
                                onChange={() => onToggleStatus(role)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <Typography
                                variant="caption"
                                color={role.isActive ? "success.main" : "text.secondary"}
                                sx={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}
                            >
                                {role.isActive ? "Activo" : "Inactivo"}
                            </Typography>
                        </Box>
                    </Tooltip>
                </Box>
            </Box>
        </Paper>
    );
}

export default function RoleTab({ search, createOpen, onCreateClose }: RoleTabProps) {
    const [page, setPage]               = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editOpen, setEditOpen]         = useState(false);
    const [snackbar, setSnackbar]         = useState<SnackbarState>({ open: false, message: "", severity: "success" });

    const theme = useTheme();
    const { ready: layoutReady, isNarrow: isNarrowLayout } = useNarrowLayoutMd();
    const isShortLabel = useMediaQuery(theme.breakpoints.down("sm"));

    const { data, loading, refetch, updateRow } = useRoles({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: search || undefined,
    });

    const { execute: statusRole } = useStatusRole();

    const showSnackbar = (message: string, severity: "success" | "error" = "success") =>
        setSnackbar({ open: true, message, severity });

    const handleEdit = (role: Role) => { setSelectedRole(role); setEditOpen(true); };

    const handleToggleStatus = async (role: Role) => {
        const newStatus = !role.isActive;
        updateRow(role.id, { isActive: newStatus });
        const result = await statusRole(role.id, newStatus);
        if (result) {
            showSnackbar(newStatus ? "Rol activado exitosamente." : "Rol desactivado exitosamente.");
        } else {
            updateRow(role.id, { isActive: role.isActive });
            showSnackbar("Error al cambiar el estado del rol.", "error");
        }
    };

    const columns: TableColumn<Role>[] = [
        {
            key: "index", label: "#", width: 60,
            render: (_, i) => page * rowsPerPage + i + 1,
        },
        { key: "name",        label: "Nombre",      width: 160 },
        { key: "description", label: "Descripción" },
        {
            key: "permissions",
            label: "Permisos",
            width: 90,
            align: "center",
            render: (row) => (
                <Chip label={row.permissions.length} size="small" variant="outlined" />
            ),
        },
        {
            key: "isActive",
            label: "Estado",
            width: 130,
            align: "center",
            render: (row) => (
                <Tooltip title={row.isActive ? "Desactivar" : "Activar"}>
                    <Box
                        sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, cursor: "pointer" }}
                        onClick={() => handleToggleStatus(row)}
                    >
                        <Switch
                            checked={row.isActive}
                            size="small"
                            color="success"
                            onChange={() => handleToggleStatus(row)}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <Typography variant="caption" color={row.isActive ? "success.main" : "text.secondary"}>
                            {row.isActive ? "Activo" : "Inactivo"}
                        </Typography>
                    </Box>
                </Tooltip>
            ),
        },
        {
            key: "actions",
            label: "Acciones",
            width: 80,
            align: "center",
            render: (row) => (
                row.isActive ? (
                    <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleEdit(row)}>
                            <EditRoundedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                ) : null
            ),
        },
    ];

    return (
        <>
            {!layoutReady ? (
                <ListLayoutMeasurePlaceholder />
            ) : isNarrowLayout ? (
                <Paper
                    variant="outlined"
                    sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        maxWidth: "100%",
                    }}
                >
                    <Grid
                        container
                        spacing={1.5}
                        sx={{ p: 2, maxWidth: "100%", boxSizing: "border-box", width: "100%" }}
                    >
                        {loading ? (
                            Array.from({ length: rowsPerPage }).map((_, i) => (
                                <Grid key={i} size={{ xs: 12, sm: 6 }}>
                                    <Skeleton variant="rounded" height={148} sx={{ borderRadius: 2 }} />
                                </Grid>
                            ))
                        ) : (data?.results ?? []).length === 0 ? (
                            <Grid size={12}>
                                <Box sx={{ py: 6, textAlign: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No se encontraron roles.
                                    </Typography>
                                </Box>
                            </Grid>
                        ) : (
                            (data?.results ?? []).map((row) => (
                                <Grid key={row.id} size={{ xs: 12, sm: 6 }}>
                                    <RoleMobileCard
                                        role={row}
                                        onEdit={handleEdit}
                                        onToggleStatus={handleToggleStatus}
                                    />
                                </Grid>
                            ))
                        )}
                    </Grid>
                    <TablePagination
                        component="div"
                        count={data?.count ?? 0}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage={isShortLabel ? "Filas" : "Filas:"}
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
                        }
                        sx={compactTablePaginationSx}
                    />
                </Paper>
            ) : (
                <DataTable<Role>
                    columns={columns}
                    rows={data?.results ?? []}
                    total={data?.count ?? 0}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
                    getRowKey={(row) => row.id}
                    loading={loading}
                    emptyMessage="No se encontraron roles."
                />
            )}

            <CreateRole
                open={createOpen}
                onClose={onCreateClose}
                onSuccess={() => { refetch(); showSnackbar("Rol creado exitosamente."); }}
            />
            <EditRole
                open={editOpen}
                role={selectedRole}
                onClose={() => setEditOpen(false)}
                onSuccess={() => { refetch(); showSnackbar("Rol actualizado exitosamente."); }}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    severity={snackbar.severity}
                    variant="filled"
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
