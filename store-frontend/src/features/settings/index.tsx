'use client';

import { useState, useEffect, useRef, ChangeEvent } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useAuthStore } from "@/store/auth.store";
import { PERMISSIONS } from "@/shared/config/permissions";
import { SettingsService } from "./services/settings.service";
import type { UpdateProfileForm, ChangePasswordForm, StoreConfig, StoreConfigUpdate } from "./types/settingsTypes";
import { toMediaUrl } from "@/shared/utils/mediaUrl";
import AvatarPreviewDialog from "@/shared/components/AvatarPreviewDialog";
import { useStoreConfigStore } from "@/store/storeConfig.store";
import Image from "next/image";

const PROFILE_AVATAR_PX = 128;
const STORE_LOGO_PREVIEW_PX = 160;

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            variant="overline"
            sx={{
                color: "primary.main",
                fontWeight: 700,
                letterSpacing: "0.14em",
                display: "block",
                mb: 1.25,
                lineHeight: 1.4,
            }}
        >
            {children}
        </Typography>
    );
}

function TabPanelCard({ children, sx }: { children: React.ReactNode; sx?: object }) {
    const theme = useTheme();
    const bg =
        theme.palette.mode === "dark"
            ? alpha(theme.palette.common.white, 0.04)
            : alpha(theme.palette.common.black, 0.03);
    return (
        <Box
            sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: bg,
                ...sx,
            }}
        >
            {children}
        </Box>
    );
}

export default function Settings() {
    const user         = useAuthStore((s) => s.user);
    const setSession   = useAuthStore((s) => s.setSession);
    const clearSession = useAuthStore((s) => s.clearSession);
    const hasPermission = useAuthStore((s) => s.hasPermission);

    const canReadStore   = hasPermission(PERMISSIONS.SETTINGS.READ);
    const canUpdateStore = hasPermission(PERMISSIONS.SETTINGS.UPDATE);

    const [tab, setTab] = useState(0);

    /* ── Perfil ─────────────────────────────────────── */
    const [profile, setProfile] = useState<UpdateProfileForm>({
        name: user?.name ?? "",
        email: user?.email ?? "",
    });

    // Sincroniza los campos cuando el store hidrata o el usuario cambia
    useEffect(() => {
        if (user) {
            setProfile({ name: user.name, email: user.email });
        }
    }, [user?.name, user?.email]);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
    const [emailRedirectCountdown, setEmailRedirectCountdown] = useState<number | null>(null);

    const profileChanged =
        profile.name.trim() !== (user?.name ?? "") ||
        profile.email.trim() !== (user?.email ?? "");

    const emailChanged = profile.email.trim() !== (user?.email ?? "");

    // Countdown después de confirmar el cambio de email
    useEffect(() => {
        if (emailRedirectCountdown === null) return;
        if (emailRedirectCountdown === 0) {
            clearSession();
            window.location.href = "/login";
            return;
        }
        const timer = setTimeout(() => setEmailRedirectCountdown((c) => (c ?? 1) - 1), 1000);
        return () => clearTimeout(timer);
    }, [emailRedirectCountdown]);

    /* ── Avatar ─────────────────────────────────────── */
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
    const [avatarDeleteConfirmOpen, setAvatarDeleteConfirmOpen] = useState(false);

    /* ── Tienda ─────────────────────────────────────── */
    const [storeForm, setStoreForm] = useState<StoreConfigUpdate>({ storeName: "", storeRuc: "", storeAddress: "" });
    const [storeLoading, setStoreLoading]   = useState(false);
    const [storeFetching, setStoreFetching] = useState(false);
    const [storeSuccess, setStoreSuccess]   = useState(false);
    const [storeError, setStoreError]       = useState<string | null>(null);
    const [storeOriginal, setStoreOriginal] = useState<StoreConfig | null>(null);

    /* ── Logo tienda ─────────────────────────────────── */
    const logoFileInputRef = useRef<HTMLInputElement>(null);
    const [logoLoading, setLogoLoading]   = useState(false);
    const [logoError, setLogoError]       = useState<string | null>(null);
    const [logoDeleteConfirm, setLogoDeleteConfirm] = useState(false);
    const [logoPreviewOpen, setLogoPreviewOpen]     = useState(false);
    const setGlobalLogo = useStoreConfigStore((s) => s.setLogoUrl);
    const setGlobalStoreConfig = useStoreConfigStore((s) => s.setStoreConfig);

    useEffect(() => {
        if (tab !== 2 || !canReadStore) return;
        setStoreFetching(true);
        SettingsService.getStoreConfig()
            .then((cfg) => {
                setStoreOriginal(cfg);
                setStoreForm({ storeName: cfg.storeName, storeRuc: cfg.storeRuc ?? "", storeAddress: cfg.storeAddress ?? "" });
                // Sync global branding store
                setGlobalStoreConfig({ storeName: cfg.storeName, logoUrl: cfg.logoUrl ?? null });
            })
            .catch(() => setStoreError("No se pudo cargar la configuración de la tienda"))
            .finally(() => setStoreFetching(false));
    }, [tab, canReadStore]);

    const storeChanged =
        storeOriginal !== null && (
            storeForm.storeName.trim() !== storeOriginal.storeName ||
            (storeForm.storeRuc ?? "") !== (storeOriginal.storeRuc ?? "") ||
            (storeForm.storeAddress ?? "") !== (storeOriginal.storeAddress ?? "")
        );

    const handleStoreChange = (e: ChangeEvent<HTMLInputElement>) => {
        setStoreForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setStoreSuccess(false);
        setStoreError(null);
    };

    const handleStoreSubmit = async () => {
        setStoreLoading(true);
        setStoreError(null);
        setStoreSuccess(false);
        try {
            const updated = await SettingsService.updateStoreConfig(storeForm);
            setStoreOriginal(updated);
            setStoreForm({ storeName: updated.storeName, storeRuc: updated.storeRuc ?? "", storeAddress: updated.storeAddress ?? "" });
            setGlobalStoreConfig({ storeName: updated.storeName, logoUrl: updated.logoUrl ?? null });
            setStoreSuccess(true);
        } catch (err: unknown) {
            setStoreError(err instanceof Error ? err.message : "Error al guardar la configuración");
        } finally {
            setStoreLoading(false);
        }
    };

    /* ── Logo ──────────────────────────────────────── */
    const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoLoading(true);
        setLogoError(null);
        try {
            const updated = await SettingsService.uploadLogo(file);
            setStoreOriginal(updated);
            setGlobalLogo(updated.logoUrl ?? null);
        } catch (err: unknown) {
            setLogoError(err instanceof Error ? err.message : "Error al subir el logo");
        } finally {
            setLogoLoading(false);
            if (logoFileInputRef.current) logoFileInputRef.current.value = "";
        }
    };

    const handleLogoDelete = async () => {
        setLogoDeleteConfirm(false);
        setLogoLoading(true);
        setLogoError(null);
        try {
            const updated = await SettingsService.deleteLogo();
            setStoreOriginal(updated);
            setGlobalLogo(null);
        } catch (err: unknown) {
            setLogoError(err instanceof Error ? err.message : "Error al eliminar el logo");
        } finally {
            setLogoLoading(false);
        }
    };

    /* ── Contraseña ─────────────────────────────────── */
    const [passwords, setPasswords] = useState<ChangePasswordForm>({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [passSuccess, setPassSuccess] = useState(false);
    const [passError, setPassError] = useState<string | null>(null);

    /* ── Helpers ────────────────────────────────────── */
    const avatarSrc = toMediaUrl(user?.avatarUrl) || undefined;

    const initials = user?.name
        ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
        : "?";

    /* ── Handlers ───────────────────────────────────── */
    const handleProfileChange = (e: ChangeEvent<HTMLInputElement>) => {
        setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setProfileSuccess(false);
        setProfileError(null);
    };

    const handleProfileSubmit = async () => {
        setEmailConfirmOpen(false);
        setProfileLoading(true);
        setProfileError(null);
        setProfileSuccess(false);
        try {
            const updated = await SettingsService.updateProfile(profile);
            if (user) {
                setSession(updated);
            }
            if (emailChanged) {
                setEmailRedirectCountdown(5);
            } else {
                setProfileSuccess(true);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al actualizar el perfil";
            setProfileError(msg);
        } finally {
            setProfileLoading(false);
        }
    };

    // Si el email cambió pide confirmación antes de guardar
    const handleProfileSaveClick = () => {
        if (emailChanged) {
            setEmailConfirmOpen(true);
        } else {
            handleProfileSubmit();
        }
    };

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleAvatarDelete = async () => {
        setAvatarDeleteConfirmOpen(false);
        setAvatarLoading(true);
        setAvatarError(null);
        try {
            const updated = await SettingsService.deleteAvatar();
            if (user) {
                setSession(updated);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al eliminar la imagen";
            setAvatarError(msg);
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarLoading(true);
        setAvatarError(null);
        try {
            const updated = await SettingsService.uploadAvatar(file);
            if (user) {
                setSession(updated);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al subir la imagen";
            setAvatarError(msg);
        } finally {
            setAvatarLoading(false);
            // Reset input so the same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setPassSuccess(false);
        setPassError(null);
    };

    const handlePasswordSubmit = async () => {
        if (passwords.newPassword !== passwords.confirmPassword) {
            setPassError("La nueva contraseña y la confirmación no coinciden");
            return;
        }
        setPassLoading(true);
        setPassError(null);
        setPassSuccess(false);
        try {
            await SettingsService.changePassword(passwords);
            setPassSuccess(true);
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al cambiar la contraseña";
            setPassError(msg);
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <Box
            sx={{
                maxWidth: 720,
                width: "100%",
                minWidth: 0,
                mx: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 2,
            }}
        >
            <Box>
                <Typography
                    component="h1"
                    variant="h5"
                    fontWeight={800}
                    letterSpacing="0.06em"
                    sx={{ color: "primary.main", mb: 0.5 }}
                >
                    Configuración
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Perfil, contraseña y datos de la tienda en un solo lugar.
                </Typography>
            </Box>

            <Box
                sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    mx: { xs: -0.5, sm: 0 },
                    "& .MuiTab-root": { minHeight: 48, textTransform: "none", fontWeight: 600 },
                }}
            >
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{ px: { xs: 0.5, sm: 0 } }}
                >
                    <Tab icon={<PersonRoundedIcon />} iconPosition="start" label="Perfil" />
                    <Tab icon={<LockRoundedIcon />} iconPosition="start" label="Seguridad" />
                    {canReadStore && (
                        <Tab icon={<StorefrontRoundedIcon />} iconPosition="start" label="Tienda" />
                    )}
                </Tabs>
            </Box>

            {/* ── TAB PERFIL ─────────────────────────────── */}
            {tab === 0 && (
                <Stack spacing={3}>
                    <SectionTitle>Foto de perfil</SectionTitle>
                    <TabPanelCard>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: { xs: "column", sm: "row" },
                                alignItems: { xs: "center", sm: "flex-start" },
                                gap: 2.5,
                            }}
                        >
                            <Box sx={{ position: "relative", flexShrink: 0 }}>
                                <Avatar
                                    src={avatarSrc}
                                    onClick={avatarSrc ? () => setAvatarPreviewOpen(true) : undefined}
                                    sx={{
                                        width: PROFILE_AVATAR_PX,
                                        height: PROFILE_AVATAR_PX,
                                        fontSize: 40,
                                        bgcolor: avatarSrc ? "transparent" : "primary.main",
                                        transform: "translateZ(0)",
                                        cursor: avatarSrc ? "pointer" : "default",
                                        border: avatarSrc ? "2px solid" : "none",
                                        borderColor: "primary.main",
                                        boxShadow: avatarSrc ? 2 : 0,
                                    }}
                                >
                                    {!avatarSrc && initials}
                                </Avatar>
                                {avatarLoading && (
                                    <CircularProgress
                                        size={PROFILE_AVATAR_PX}
                                        thickness={2.5}
                                        sx={{ position: "absolute", top: 0, left: 0, color: "primary.main" }}
                                    />
                                )}
                                <Tooltip title="Elegir imagen">
                                    <IconButton
                                        size="small"
                                        onClick={handleAvatarClick}
                                        disabled={avatarLoading}
                                        sx={{
                                            position: "absolute",
                                            bottom: 4,
                                            right: 4,
                                            bgcolor: "background.paper",
                                            border: "1px solid",
                                            borderColor: "divider",
                                            boxShadow: 1,
                                            "&:hover": { bgcolor: "action.hover" },
                                        }}
                                    >
                                        <EditRoundedIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                                {avatarSrc && (
                                    <Tooltip title="Eliminar imagen">
                                        <IconButton
                                            size="small"
                                            onClick={() => setAvatarDeleteConfirmOpen(true)}
                                            disabled={avatarLoading}
                                            sx={{
                                                position: "absolute",
                                                top: 4,
                                                right: 4,
                                                bgcolor: "background.paper",
                                                border: "1px solid",
                                                borderColor: "error.main",
                                                color: "error.main",
                                                boxShadow: 1,
                                                "&:hover": { bgcolor: "error.main", color: "error.contrastText" },
                                            }}
                                        >
                                            <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={handleAvatarChange}
                                />
                            </Box>
                            <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", sm: "left" } }}>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    {user?.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {user?.role}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", maxWidth: { xs: "100%", sm: 400 }, mx: { xs: "auto", sm: 0 } }}
                                >
                                    Toca la imagen para verla en grande. Formatos habituales (JPG, PNG, etc.).
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddPhotoAlternateRoundedIcon />}
                                    onClick={handleAvatarClick}
                                    disabled={avatarLoading}
                                    sx={{ alignSelf: { xs: "center", sm: "flex-start" }, mt: 0.5, fontWeight: 700 }}
                                >
                                    {avatarSrc ? "Elegir otra imagen" : "Elegir imagen"}
                                </Button>
                            </Stack>
                        </Box>
                    </TabPanelCard>

                    {avatarError && <Alert severity="error">{avatarError}</Alert>}

                    {avatarSrc && (
                        <AvatarPreviewDialog
                            open={avatarPreviewOpen}
                            src={avatarSrc}
                            alt={user?.name}
                            onClose={() => setAvatarPreviewOpen(false)}
                        />
                    )}

                    <SectionTitle>Datos de la cuenta</SectionTitle>
                    <TabPanelCard>
                        <Stack spacing={2}>
                            <TextField
                                label="Nombre"
                                name="name"
                                value={profile.name}
                                onChange={handleProfileChange}
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Correo electrónico"
                                name="email"
                                type="email"
                                value={profile.email}
                                onChange={handleProfileChange}
                                fullWidth
                                size="small"
                            />

                            {profileError && <Alert severity="error">{profileError}</Alert>}
                            {profileSuccess && (
                                <Alert severity="success" sx={{ "& .MuiAlert-message": { overflowWrap: "anywhere" } }}>
                                    {profile.email.trim() !== user?.email
                                        ? "Perfil actualizado. El correo cambió — serás redirigido al login en unos segundos."
                                        : "Perfil actualizado correctamente"}
                                </Alert>
                            )}

                            <Button
                                variant="contained"
                                onClick={handleProfileSaveClick}
                                disabled={profileLoading || !profileChanged}
                                startIcon={
                                    profileLoading
                                        ? <CircularProgress size={16} color="inherit" />
                                        : <SaveRoundedIcon />
                                }
                                sx={{
                                    alignSelf: { xs: "stretch", sm: "flex-start" },
                                    width: { xs: "100%", sm: "auto" },
                                    fontWeight: 700,
                                }}
                            >
                                {profileLoading ? "Guardando..." : "Guardar cambios"}
                            </Button>
                        </Stack>
                    </TabPanelCard>
                </Stack>
            )}

            {/* ── TAB SEGURIDAD ──────────────────────────── */}
            {tab === 1 && (
                <Stack spacing={3}>
                    <SectionTitle>Contraseña</SectionTitle>
                    <TabPanelCard>
                        <Stack spacing={0.75} sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Cambiar contraseña
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Escribe tu contraseña actual y la nueva dos veces para confirmar.
                            </Typography>
                        </Stack>

                        <Stack spacing={2}>
                            <TextField
                                label="Contraseña actual"
                                name="currentPassword"
                                type={showCurrent ? "text" : "password"}
                                value={passwords.currentPassword}
                                onChange={handlePasswordChange}
                                fullWidth
                                size="small"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end" aria-label="Mostrar contraseña">
                                                {showCurrent ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                label="Nueva contraseña"
                                name="newPassword"
                                type={showNew ? "text" : "password"}
                                value={passwords.newPassword}
                                onChange={handlePasswordChange}
                                fullWidth
                                size="small"
                                helperText="Mínimo 6 caracteres"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowNew((v) => !v)} edge="end" aria-label="Mostrar contraseña">
                                                {showNew ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                label="Confirmar nueva contraseña"
                                name="confirmPassword"
                                type={showConfirm ? "text" : "password"}
                                value={passwords.confirmPassword}
                                onChange={handlePasswordChange}
                                fullWidth
                                size="small"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end" aria-label="Mostrar contraseña">
                                                {showConfirm ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {passError && <Alert severity="error">{passError}</Alert>}
                            {passSuccess && <Alert severity="success">Contraseña cambiada correctamente</Alert>}

                            <Button
                                variant="contained"
                                onClick={handlePasswordSubmit}
                                disabled={passLoading || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
                                startIcon={
                                    passLoading
                                        ? <CircularProgress size={16} color="inherit" />
                                        : <SaveRoundedIcon />
                                }
                                sx={{
                                    alignSelf: { xs: "stretch", sm: "flex-start" },
                                    width: { xs: "100%", sm: "auto" },
                                    fontWeight: 700,
                                }}
                            >
                                Cambiar contraseña
                            </Button>
                        </Stack>
                    </TabPanelCard>
                </Stack>
            )}

            {/* ── TAB TIENDA ────────────────────────────── */}
            {tab === 2 && canReadStore && (
                <Stack spacing={3}>
                    {storeFetching ? (
                        <TabPanelCard>
                            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                                <CircularProgress size={32} />
                            </Box>
                        </TabPanelCard>
                    ) : (
                        <>
                            <SectionTitle>Logo de la tienda</SectionTitle>
                            <TabPanelCard>
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: { xs: "column", sm: "row" },
                                        alignItems: { xs: "center", sm: "flex-start" },
                                        gap: 2.5,
                                    }}
                                >
                                    <Box sx={{ position: "relative", flexShrink: 0 }}>
                                        <Box
                                            onClick={
                                                storeOriginal?.logoUrl && !logoLoading
                                                    ? () => setLogoPreviewOpen(true)
                                                    : undefined
                                            }
                                            sx={{
                                                width: STORE_LOGO_PREVIEW_PX,
                                                height: STORE_LOGO_PREVIEW_PX,
                                                borderRadius: 2,
                                                border: "2px solid",
                                                borderColor: storeOriginal?.logoUrl ? "primary.main" : "divider",
                                                bgcolor: "action.hover",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                overflow: "hidden",
                                                position: "relative",
                                                cursor: storeOriginal?.logoUrl && !logoLoading ? "pointer" : "default",
                                                boxShadow: storeOriginal?.logoUrl ? 2 : 0,
                                                transition: "opacity 0.15s, border-color 0.15s",
                                                "&:hover":
                                                    storeOriginal?.logoUrl && !logoLoading
                                                        ? { opacity: 0.92 }
                                                        : {},
                                            }}
                                        >
                                            {logoLoading ? (
                                                <CircularProgress size={36} />
                                            ) : storeOriginal?.logoUrl ? (
                                                <Image
                                                    src={toMediaUrl(storeOriginal.logoUrl) || ""}
                                                    alt="Logo"
                                                    fill
                                                    style={{ objectFit: "contain", padding: "10px" }}
                                                    unoptimized
                                                />
                                            ) : (
                                                <StorefrontRoundedIcon sx={{ fontSize: 56, color: "text.disabled" }} />
                                            )}
                                        </Box>
                                        {canUpdateStore && (
                                            <>
                                                <Tooltip title="Elegir imagen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            logoFileInputRef.current?.click();
                                                        }}
                                                        disabled={logoLoading}
                                                        sx={{
                                                            position: "absolute",
                                                            bottom: 4,
                                                            right: 4,
                                                            bgcolor: "background.paper",
                                                            border: "1px solid",
                                                            borderColor: "divider",
                                                            boxShadow: 1,
                                                            "&:hover": { bgcolor: "action.hover" },
                                                        }}
                                                    >
                                                        <EditRoundedIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </Tooltip>
                                                {storeOriginal?.logoUrl && (
                                                    <Tooltip title="Eliminar imagen">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLogoDeleteConfirm(true);
                                                            }}
                                                            disabled={logoLoading}
                                                            sx={{
                                                                position: "absolute",
                                                                top: 4,
                                                                right: 4,
                                                                bgcolor: "background.paper",
                                                                border: "1px solid",
                                                                borderColor: "error.main",
                                                                color: "error.main",
                                                                boxShadow: 1,
                                                                "&:hover": { bgcolor: "error.main", color: "error.contrastText" },
                                                            }}
                                                        >
                                                            <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <input
                                                    ref={logoFileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    hidden
                                                    onChange={handleLogoUpload}
                                                />
                                            </>
                                        )}
                                    </Box>

                                    <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", sm: "left" } }}>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            Imagen del comercio
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: "block", maxWidth: { xs: "100%", sm: 420 }, mx: { xs: "auto", sm: 0 } }}
                                        >
                                            Toca la imagen para verla en grande. Se usa en el panel y en recibos; PNG, JPG o SVG, idealmente cuadrada.
                                        </Typography>
                                        {canUpdateStore && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<AddPhotoAlternateRoundedIcon />}
                                                onClick={() => logoFileInputRef.current?.click()}
                                                disabled={logoLoading}
                                                sx={{ alignSelf: { xs: "center", sm: "flex-start" }, mt: 0.5, fontWeight: 700 }}
                                            >
                                                {storeOriginal?.logoUrl ? "Elegir otra imagen" : "Elegir imagen"}
                                            </Button>
                                        )}
                                    </Stack>
                                </Box>
                                {logoError && <Alert severity="error" sx={{ mt: 2 }}>{logoError}</Alert>}

                                {storeOriginal?.logoUrl && (
                                    <AvatarPreviewDialog
                                        open={logoPreviewOpen}
                                        src={toMediaUrl(storeOriginal.logoUrl) || ""}
                                        alt="Logo de la tienda"
                                        onClose={() => setLogoPreviewOpen(false)}
                                    />
                                )}
                            </TabPanelCard>

                            <SectionTitle>Datos de la tienda</SectionTitle>
                            <TabPanelCard>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Esta información aparece en el encabezado de las notas de venta (recibos PDF).
                                </Typography>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Nombre de la tienda"
                                        name="storeName"
                                        value={storeForm.storeName}
                                        onChange={handleStoreChange}
                                        fullWidth
                                        size="small"
                                        disabled={!canUpdateStore}
                                        required
                                    />
                                    <TextField
                                        label="RUC"
                                        name="storeRuc"
                                        value={storeForm.storeRuc ?? ""}
                                        onChange={handleStoreChange}
                                        fullWidth
                                        size="small"
                                        disabled={!canUpdateStore}
                                        inputProps={{ maxLength: 20 }}
                                    />
                                    <TextField
                                        label="Dirección"
                                        name="storeAddress"
                                        value={storeForm.storeAddress ?? ""}
                                        onChange={handleStoreChange}
                                        fullWidth
                                        size="small"
                                        disabled={!canUpdateStore}
                                        multiline
                                        rows={2}
                                    />

                                    {storeError && <Alert severity="error">{storeError}</Alert>}
                                    {storeSuccess && <Alert severity="success">Configuración guardada correctamente</Alert>}

                                    {canUpdateStore && (
                                        <Button
                                            variant="contained"
                                            onClick={handleStoreSubmit}
                                            disabled={storeLoading || !storeChanged || !storeForm.storeName.trim()}
                                            startIcon={
                                                storeLoading
                                                    ? <CircularProgress size={16} color="inherit" />
                                                    : <SaveRoundedIcon />
                                            }
                                            sx={{
                                                alignSelf: { xs: "stretch", sm: "flex-start" },
                                                width: { xs: "100%", sm: "auto" },
                                                fontWeight: 700,
                                            }}
                                        >
                                            {storeLoading ? "Guardando..." : "Guardar cambios"}
                                        </Button>
                                    )}
                                </Stack>
                            </TabPanelCard>
                        </>
                    )}
                </Stack>
            )}

            {/* ── Confirmación eliminar avatar ── */}
            <Dialog
                open={avatarDeleteConfirmOpen}
                onClose={() => setAvatarDeleteConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
                disableRestoreFocus
            >
                <DialogTitle>¿Eliminar foto de perfil?</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                            Tu foto de perfil será eliminada y se mostrará tus iniciales en su lugar.
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                justifyContent: "flex-end",
                                flexDirection: { xs: "column-reverse", sm: "row" },
                                mt: 1,
                                "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                            }}
                        >
                            <Button variant="outlined" color="inherit" onClick={() => setAvatarDeleteConfirmOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="contained" color="error" onClick={handleAvatarDelete}>
                                Eliminar
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* ── Confirmación antes de cambiar email ── */}
            <Dialog
                open={emailConfirmOpen}
                onClose={() => { setEmailConfirmOpen(false); setProfile((p) => ({ ...p, email: user?.email ?? "" })); }}
                maxWidth="xs"
                fullWidth
                disableRestoreFocus
            >
                <DialogTitle>¿Cambiar correo electrónico?</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                            Tu correo será cambiado de <strong>{user?.email}</strong> a <strong>{profile.email}</strong>.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Al confirmar, tu sesión actual se cerrará y deberás iniciar sesión con el nuevo correo.
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                justifyContent: "flex-end",
                                flexDirection: { xs: "column-reverse", sm: "row" },
                                mt: 1,
                                "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                            }}
                        >
                            <Button variant="outlined" color="inherit" onClick={() => { setEmailConfirmOpen(false); setProfile((p) => ({ ...p, email: user?.email ?? "" })); }}>
                                Cancelar
                            </Button>
                            <Button variant="contained" onClick={handleProfileSubmit} startIcon={<SaveRoundedIcon />}>
                                Confirmar cambio
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* ── Confirmación eliminar logo ── */}
            <Dialog
                open={logoDeleteConfirm}
                onClose={() => setLogoDeleteConfirm(false)}
                maxWidth="xs"
                fullWidth
                disableRestoreFocus
            >
                <DialogTitle>¿Eliminar logo de la tienda?</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                            El logo será eliminado y se mostrará un ícono predeterminado en el panel.
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                justifyContent: "flex-end",
                                flexDirection: { xs: "column-reverse", sm: "row" },
                                mt: 1,
                                "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                            }}
                        >
                            <Button variant="outlined" color="inherit" onClick={() => setLogoDeleteConfirm(false)}>
                                Cancelar
                            </Button>
                            <Button variant="contained" color="error" onClick={handleLogoDelete}>
                                Eliminar
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* ── Countdown tras confirmar cambio de email ── */}
            <Dialog open={emailRedirectCountdown !== null} maxWidth="xs" fullWidth disableRestoreFocus>
                <DialogTitle sx={{ textAlign: "center", pt: 3 }}>Correo actualizado</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pb: 2 }}>
                        <Box
                            sx={{
                                width: 72,
                                height: 72,
                                borderRadius: "50%",
                                border: "4px solid",
                                borderColor: "primary.main",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Typography variant="h4" fontWeight={700} color="primary">
                                {emailRedirectCountdown}
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            Redirigiendo al inicio de sesión para que ingreses con tu nuevo correo...
                        </Typography>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
