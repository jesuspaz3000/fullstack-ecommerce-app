import { Box, Typography } from "@mui/material";

export default function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                py: 2,
                px: 3,
                textAlign: "center",
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
            }}
        >
            <Typography variant="caption" color="text.secondary">
                © {new Date().getFullYear()} Sotware Development. Todos los derechos reservados.
            </Typography>
        </Box>
    );
}
