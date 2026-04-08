'use client';

import { useState, useEffect } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    TextField,
    Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
    adminFormDialogActionsSx,
    adminFormDialogContentSx,
    adminFormDialogPaperSx,
    adminFormDialogTitleRowSx,
} from "@/shared/mui/adminFormDialog";
import { useUpdateUser } from "../hooks/usersHooks";
import { User } from "../types/usersTypes";
import { RoleService } from "@/features/roles/services/roles.service";
import { Role } from "@/features/roles/types/rolesTypes";

interface EditUserProps {
    open: boolean;
    user: User | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditUser({ open, user, onClose, onSuccess }: EditUserProps) {
    const { execute: updateUser, loading, error } = useUpdateUser();

    const [name, setName]     = useState("");
    const [email, setEmail]   = useState("");
    const [roleId, setRoleId] = useState<number | "">("");

    const [roles, setRoles]               = useState<Role[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName(user?.name ?? "");
        setEmail(user?.email ?? "");
        setRoleId("");

        setLoadingRoles(true);
        RoleService.getAllRoles()
            .then((res) => {
                const active = res.filter((r) => r.isActive);
                setRoles(active);
                const match = active.find((r) => r.name === user?.role);
                if (match) setRoleId(match.id);
            })
            .catch(() => setRoles([]))
            .finally(() => setLoadingRoles(false));
    }, [open, user]);

    const handleClose = () => { (document.activeElement as HTMLElement)?.blur(); onClose(); };

    const handleSubmit = async () => {
        if (!user || !name.trim() || !email.trim() || roleId === "") return;
        const result = await updateUser(Number(user.id), { name: name.trim(), email: email.trim(), roleId: roleId as number });
        if (result) { onSuccess(); handleClose(); }
    };

    const isValid = name.trim() && email.trim() && roleId !== "";

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            closeAfterTransition={false}
            disableRestoreFocus
            scroll="paper"
            slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
        >
            <DialogTitle sx={adminFormDialogTitleRowSx}>
                <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}>
                    Editar usuario
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
                        fullWidth required size="small"
                    />
                    <TextField
                        label="Correo electrónico"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        fullWidth required size="small"
                    />
                    <TextField
                        select
                        label="Rol"
                        value={roleId}
                        onChange={(e) => setRoleId(Number(e.target.value))}
                        fullWidth required size="small"
                        disabled={loadingRoles}
                        InputProps={loadingRoles ? {
                            endAdornment: <CircularProgress size={16} sx={{ mr: 1 }} />,
                        } : undefined}
                    >
                        {roles.map((r) => (
                            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                    </TextField>
                </Box>
            </DialogContent>

            <DialogActions sx={adminFormDialogActionsSx}>
                <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    loading={loading}
                    disabled={!isValid}
                >
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
