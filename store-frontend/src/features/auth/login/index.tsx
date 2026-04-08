import { Box } from "@mui/material";
import ThemeToggle from "@/shared/components/themeToggle";
import AuthPublicEntryCleanup from "@/features/auth/components/AuthPublicEntryCleanup";
import LoginForm from "@/features/auth/login/components/loginForm";

export default function Login() {
    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                bgcolor: "background.default",
            }}
        >
            <AuthPublicEntryCleanup />
            <ThemeToggle floating />

            <Box
                sx={{
                    width: { xs: "90%", sm: "420px" },
                    bgcolor: "background.card",
                    backdropFilter: "blur(12px)",
                    borderRadius: 3,
                    p: { xs: 3, sm: 5 },
                    boxShadow: 8,
                }}
            >
                <LoginForm />
            </Box>
        </Box>
    );
}
