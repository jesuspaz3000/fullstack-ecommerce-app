'use client';

import { useState, SubmitEvent } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Divider,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Link,
    TextField,
    Typography,
} from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { AuthService } from "@/shared/services/auth.service";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";

export default function LoginForm() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await AuthService.login({ email, password });
            router.push("/dashboard");
        } catch (err) {
            const response = (err as AxiosError<{ message?: string }>)?.response;
            const status   = response?.status;
            const message  = response?.data?.message ?? "";

            if (status === 401 && message === "User account is disabled") {
                setError("Tu cuenta está deshabilitada. Contacta al administrador.");
            } else if (status === 401 || status === 422) {
                setError("Correo o contraseña incorrectos.");
            } else {
                setError("Ocurrió un error. Intenta de nuevo más tarde.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            component="form"
            noValidate
            onSubmit={handleSubmit}
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                width: "100%",
            }}
        >
            <Box sx={{ textAlign: "center", mb: 1 }}>
                <Typography variant="h5" fontWeight={700} letterSpacing={1}>
                    Iniciar sesión
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Bienvenido de nuevo
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <TextField
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                variant="outlined"
                autoComplete="new-email"
                disabled={loading}
            />

            <TextField
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                variant="outlined"
                autoComplete="new-password"
                disabled={loading}
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    edge="end"
                                    size="small"
                                >
                                    {showPassword
                                        ? <VisibilityOffRoundedIcon fontSize="small" />
                                        : <VisibilityRoundedIcon fontSize="small" />
                                    }
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: -1 }}>
                <FormControlLabel
                    control={<Checkbox size="small" />}
                    label={<Typography variant="body2">Recordarme</Typography>}
                />
                <Link
                    component="button"
                    type="button"
                    underline="hover"
                    variant="body2"
                    onClick={() => router.push("/coming-soon")}
                >
                    ¿Olvidaste tu contraseña?
                </Link>
            </Box>

            <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                loading={loading}
                sx={{ py: 1.5, fontWeight: 600, letterSpacing: 0.5 }}
            >
                Ingresar
            </Button>

            <Divider>
                <Typography variant="caption" color="text.secondary">
                    ¿No tienes una cuenta?
                </Typography>
            </Divider>

            <Button variant="outlined" size="large" fullWidth onClick={() => router.push("/coming-soon")}>
                Crear cuenta
            </Button>
        </Box>
    );
}
