'use client';

import { useState, useEffect, Fragment } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useCreateRole, useAllPermissions } from "../hooks/rolesHooks";
import { Permission } from "../types/rolesTypes";
import {
    getModuleLabelEs,
    getPermissionDescriptionEs,
    getPermissionLabelEs,
} from "@/shared/config/permissionLabels.es";
import {
    adminFormDialogActionsSx,
    adminFormDialogContentSx,
    adminFormDialogPaperSx,
    adminFormDialogTitleRowSx,
} from "@/shared/mui/adminFormDialog";

interface CreateRoleProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

function groupByModule(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
        acc[p.module] = [...(acc[p.module] ?? []), p];
        return acc;
    }, {});
}

export default function CreateRole({ open, onClose, onSuccess }: CreateRoleProps) {
    const { execute: createRole, loading, error } = useCreateRole();
    const { data: permissions, loading: loadingPerms } = useAllPermissions(open);

    const handleClose = () => { (document.activeElement as HTMLElement)?.blur(); onClose(); };

    const [name, setName]               = useState("");
    const [description, setDescription] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        if (open) {
            setName("");
            setDescription("");
            setSelectedIds([]);
        }
    }, [open]);

    const groupedPerms = groupByModule(permissions);

    const togglePermission = (id: number) =>
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );

    const toggleModule = (module: string) => {
        const ids = groupedPerms[module].map((p) => p.id);
        const allSelected = ids.every((id) => selectedIds.includes(id));
        setSelectedIds((prev) =>
            allSelected
                ? prev.filter((id) => !ids.includes(id))
                : [...new Set([...prev, ...ids])]
        );
    };

    const handleSubmit = async () => {
        if (!name.trim()) return;
        const result = await createRole({ name: name.trim(), description: description.trim(), permissionIds: selectedIds });
        if (result) { onSuccess(); handleClose(); }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            closeAfterTransition={false}
            disableRestoreFocus
            scroll="paper"
            slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
        >
            <DialogTitle sx={adminFormDialogTitleRowSx}>
                <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}>
                    Crear rol
                </Typography>
                <IconButton size="small" onClick={handleClose} disabled={loading} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={adminFormDialogContentSx}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <TextField
                        label="Nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                        size="small"
                    />

                    <TextField
                        label="Descripción"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                    />

                    <Box>
                        <Typography variant="subtitle2" fontWeight={600} mb={1}>
                            Permisos ({selectedIds.length} seleccionados)
                        </Typography>

                        {loadingPerms ? (
                            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : (
                            <TableContainer
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    maxHeight: 320,
                                    overflow: "auto",
                                }}
                            >
                                <Table size="small" stickyHeader>
                                    <TableBody>
                                        {Object.entries(groupedPerms).map(([module, perms]) => {
                                            const ids          = perms.map((p) => p.id);
                                            const allSelected  = ids.every((id) => selectedIds.includes(id));
                                            const someSelected = ids.some((id) => selectedIds.includes(id));
                                            return (
                                                <Fragment key={module}>
                                                    {/* Fila de módulo */}
                                                    <TableRow>
                                                        <TableCell sx={{ py: 0.5 }} colSpan={2}>
                                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                <Checkbox
                                                                    size="small"
                                                                    checked={allSelected}
                                                                    indeterminate={someSelected && !allSelected}
                                                                    onChange={() => toggleModule(module)}
                                                                    sx={{ p: 0.5 }}
                                                                />
                                                                <Typography variant="body2" fontWeight={700}>
                                                                    {getModuleLabelEs(module)}
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                    {/* Filas de permisos */}
                                                    {perms.map((p) => {
                                                        const desc = getPermissionDescriptionEs(p.name, p.description);
                                                        return (
                                                        <TableRow
                                                            key={p.id}
                                                            hover
                                                            onClick={() => togglePermission(p.id)}
                                                            sx={{ cursor: "pointer" }}
                                                        >
                                                            <TableCell sx={{ pl: 4, py: 0.75, width: "100%" }}>
                                                                <Typography variant="body2" component="div">
                                                                    {getPermissionLabelEs(p.name)}
                                                                </Typography>
                                                                {desc ? (
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                        component="div"
                                                                        sx={{ display: "block", mt: 0.25, lineHeight: 1.35 }}
                                                                    >
                                                                        {desc}
                                                                    </Typography>
                                                                ) : null}
                                                            </TableCell>
                                                            <TableCell padding="checkbox">
                                                                <Checkbox
                                                                    size="small"
                                                                    checked={selectedIds.includes(p.id)}
                                                                    onChange={() => togglePermission(p.id)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                        );
                                                    })}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={adminFormDialogActionsSx}>
                <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    loading={loading}
                    disabled={!name.trim()}
                >
                    Crear
                </Button>
            </DialogActions>
        </Dialog>
    );
}
