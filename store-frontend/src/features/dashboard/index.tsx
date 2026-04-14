"use client";

import { useEffect, useRef, useState } from "react";
import Grid from "@mui/material/Grid";
import {
    Alert, Box, Card, CardContent, CardHeader, Chip,
    CircularProgress, Divider, Paper, Skeleton, Stack, Tooltip, Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { BarChart } from "@mui/x-charts/BarChart";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { DashboardService } from "./services/dashboard.service";
import type {
    DashboardSummary,
    LowStockAlert,
    RegisterSalesItem,
    SellerSalesItem,
} from "./types/dashboardTypes";

const currency = (v: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

/**
 * Mide el ancho del contenedor con ResizeObserver.
 * - Primera medición (montaje): inmediata, sin espera.
 * - Mediciones siguientes (resize del sidebar): debounce para no
 *   rerenderizar en cada píxel de la transición CSS.
 */
function useDebounceWidth(delay = 260) {
    const ref     = useRef<HTMLDivElement>(null);
    const isFirst = useRef(true);
    const [width, setWidth] = useState<number | undefined>(undefined);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let timer: ReturnType<typeof setTimeout>;
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width;
            if (!w) return;
            if (isFirst.current) {
                isFirst.current = false;
                setWidth(Math.floor(w));        // inmediato al montar
            } else {
                clearTimeout(timer);
                timer = setTimeout(() => setWidth(Math.floor(w)), delay); // debounce al redimensionar
            }
        });
        ro.observe(el);
        return () => { ro.disconnect(); clearTimeout(timer); };
    }, [delay]);

    return { ref, width };
}


// ── Tarjeta de resumen ────────────────────────────────────────────────────────

function SummaryCard({
    label, value, sub, icon: Icon, color, loading,
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    color: string;
    loading: boolean;
}) {
    return (
        <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {label}
                    </Typography>
                    {loading ? (
                        <Skeleton width={90} height={40} />
                    ) : (
                        <Typography variant="h5" fontWeight={700}>
                            {value}
                        </Typography>
                    )}
                    {sub && !loading && (
                        <Typography variant="caption" color="text.secondary">
                            {sub}
                        </Typography>
                    )}
                </Box>
                <Box
                    sx={{
                        bgcolor: alpha(color, 0.15),
                        borderRadius: 2,
                        p: 1,
                        display: "flex",
                        flexShrink: 0,
                    }}
                >
                    <Icon sx={{ color, fontSize: 28 }} />
                </Box>
            </CardContent>
        </Card>
    );
}

// ── Gráfica de barras ─────────────────────────────────────────────────────────

function SalesBarChart({
    title,
    data,
    xKey,
    loading,
    color,
}: {
    title: string;
    data: { label: string; amount: number }[];
    xKey: string;
    loading: boolean;
    color: string;
}) {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down("sm"));
    const isCompact = useMediaQuery(theme.breakpoints.down("md"));

    const { ref: containerRef, width: chartWidth } = useDebounceWidth(260);

    const isEmpty = !loading && data.length === 0;

    /** En móvil el margen izquierdo fijo empujaba todo el gráfico a la derecha. */
    const chartMargin = isNarrow
        ? { left: 4, right: 4, top: 10, bottom: 44 }
        : isCompact
            ? { left: 56, right: 10, top: 14, bottom: 42 }
            : { left: 72, right: 16, top: 16, bottom: 40 };

    const tickFs = isNarrow ? 10 : 11;

    return (
        <Card variant="outlined" sx={{ height: "100%" }}>
            <CardHeader
                title={<Typography variant="subtitle1" fontWeight={700}>{title}</Typography>}
                sx={{ pb: 0 }}
            />
            <Divider />
            <CardContent
                sx={{
                    p: { xs: 0.5, sm: 1 },
                    pb: "8px !important",
                    width: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                    boxSizing: "border-box",
                }}
            >
                {/* El Box con ref siempre está en el DOM para que el
                    ResizeObserver se adjunte correctamente desde el primer render */}
                <Box ref={containerRef} sx={{ width: "100%", maxWidth: "100%", mx: 0 }}>
                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 260 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : isEmpty ? (
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 260 }}>
                            <Typography color="text.secondary" variant="body2">Sin datos disponibles</Typography>
                        </Box>
                    ) : chartWidth ? (
                        <BarChart
                            width={chartWidth}
                            dataset={data.map((d) => ({ label: d.label, amount: d.amount }))}
                            xAxis={[{
                                scaleType: "band",
                                dataKey: "label",
                                tickLabelStyle: { fontSize: tickFs },
                            }]}
                            yAxis={[{
                                valueFormatter: (v: number) => `S/.${v.toFixed(0)}`,
                                tickLabelStyle: { fontSize: tickFs },
                            }]}
                            series={[{
                                dataKey: "amount",
                                label: "Total (S/.)",
                                color,
                                valueFormatter: (v: number | null) => currency(v ?? 0),
                            }]}
                            height={isNarrow ? 260 : 270}
                            margin={chartMargin}
                            slotProps={{ legend: { sx: { display: "none" } } }}
                        />
                    ) : (
                        // Reserva el espacio mientras el ResizeObserver dispara
                        // para evitar el colapso y la posterior expansión brusca
                        <Box sx={{ height: isNarrow ? 260 : 270 }} />
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}

// ── Alertas de stock ──────────────────────────────────────────────────────────

function StockAlertChip({ stock }: { stock: number }) {
    if (stock === 0) return <Chip label="Sin stock" color="error" size="small" />;
    if (stock <= 2)  return <Chip label={`${stock} ud.`} color="error" size="small" variant="outlined" />;
    return <Chip label={`${stock} ud.`} color="warning" size="small" variant="outlined" />;
}

function LowStockAlertMobileCard({ a }: { a: LowStockAlert }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "background.paper",
            }}
        >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, lineHeight: 1.35 }}>
                {a.productName}
            </Typography>
            <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        Variante
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "right" }}>
                        {a.variantDescription}
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                        SKU
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                        {a.sku ?? "—"}
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                        Stock actual
                    </Typography>
                    <StockAlertChip stock={a.stock} />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                        Stock mín.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {a.minStock} ud.
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
}

function LowStockPanel({ alerts, loading }: { alerts: LowStockAlert[]; loading: boolean }) {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down("md"));

    return (
        <Card variant="outlined">
            <CardHeader
                avatar={<WarningAmberRoundedIcon color="warning" />}
                title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Alertas de stock
                        </Typography>
                        {!loading && alerts.length > 0 && (
                            <Chip label={alerts.length} color="warning" size="small" sx={{ fontWeight: 700 }} />
                        )}
                    </Box>
                }
                subheader={
                    <Typography variant="caption" color="text.secondary">
                        Variantes cuyo stock actual es igual o menor a su stock mínimo configurado
                    </Typography>
                }
                sx={{ pb: 0 }}
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
                {loading ? (
                    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                        {[1, 2, 3].map((i) => (
                            <Skeleton
                                key={i}
                                variant="rounded"
                                height={isNarrow ? 140 : 44}
                                sx={{ borderRadius: 2 }}
                            />
                        ))}
                    </Box>
                ) : alerts.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                            Todos los productos tienen stock suficiente
                        </Typography>
                    </Box>
                ) : isNarrow ? (
                    <Stack spacing={1.5} sx={{ p: 2 }}>
                        {alerts.map((a) => (
                            <LowStockAlertMobileCard key={a.variantId} a={a} />
                        ))}
                    </Stack>
                ) : (
                    <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                        <Box component="thead">
                            <Box component="tr" sx={{ bgcolor: "background.tableHeader" }}>
                                {["Producto", "Variante", "SKU", "Stock actual", "Stock mín."].map((h) => (
                                    <Box
                                        key={h}
                                        component="th"
                                        sx={{
                                            px: 2, py: 1, textAlign: "left",
                                            fontSize: "0.75rem", fontWeight: 700,
                                            color: "text.secondary", whiteSpace: "nowrap",
                                        }}
                                    >
                                        {h}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {alerts.map((a) => (
                                <Box
                                    key={a.variantId}
                                    component="tr"
                                    sx={{
                                        bgcolor: "background.paper",
                                        "&:hover": { bgcolor: "action.selected" },
                                        borderTop: "1px solid",
                                        borderColor: "divider",
                                    }}
                                >
                                    <Box component="td" sx={{ px: 2, py: 1 }}>
                                        <Tooltip title={a.productName}>
                                            <Typography
                                                variant="body2"
                                                fontWeight={500}
                                                sx={{
                                                    maxWidth: 220,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {a.productName}
                                            </Typography>
                                        </Tooltip>
                                    </Box>
                                    <Box component="td" sx={{ px: 2, py: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {a.variantDescription}
                                        </Typography>
                                    </Box>
                                    <Box component="td" sx={{ px: 2, py: 1 }}>
                                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                                            {a.sku ?? "—"}
                                        </Typography>
                                    </Box>
                                    <Box component="td" sx={{ px: 2, py: 1 }}>
                                        <StockAlertChip stock={a.stock} />
                                    </Box>
                                    <Box component="td" sx={{ px: 2, py: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {a.minStock} ud.
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function Dashboard() {
    const [summary, setSummary]           = useState<DashboardSummary | null>(null);
    const [sellerSales, setSellerSales]   = useState<SellerSalesItem[]>([]);
    const [registerSales, setRegisterSales] = useState<RegisterSalesItem[]>([]);
    const [alerts, setAlerts]             = useState<LowStockAlert[]>([]);

    const [loadingSummary,   setLoadingSummary]   = useState(true);
    const [loadingCharts,    setLoadingCharts]    = useState(true);
    const [loadingAlerts,    setLoadingAlerts]    = useState(true);
    const [error,            setError]            = useState<string | null>(null);

    useEffect(() => {
        DashboardService.getSummary()
            .then(setSummary)
            .catch(() => setError("No se pudo cargar el resumen"))
            .finally(() => setLoadingSummary(false));

        Promise.all([
            DashboardService.getSalesBySeller(),
            DashboardService.getSalesByRegister(),
        ])
            .then(([sellers, registers]) => {
                setSellerSales(sellers);
                setRegisterSales(registers);
            })
            .catch(() => {}) // las gráficas muestran vacío si falla
            .finally(() => setLoadingCharts(false));

        DashboardService.getLowStock()
            .then(setAlerts)
            .catch(() => {})
            .finally(() => setLoadingAlerts(false));
    }, []);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

            {/* Título */}
            <Box>
                <Typography variant="h5" fontWeight={700}>
                    Panel General
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Resumen de actividad de la tienda
                </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {/* Tarjetas de resumen */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <SummaryCard
                        label="Ventas hoy"
                        value={summary ? currency(summary.todaySales) : "—"}
                        sub={summary ? `${summary.todayOrders} orden(es)` : undefined}
                        icon={AttachMoneyRoundedIcon}
                        color="#22c55e"
                        loading={loadingSummary}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <SummaryCard
                        label="Ventas este mes"
                        value={summary ? currency(summary.monthSales) : "—"}
                        icon={CalendarMonthRoundedIcon}
                        color="#3b82f6"
                        loading={loadingSummary}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <SummaryCard
                        label="Sesiones abiertas"
                        value={summary ? String(summary.openSessions) : "—"}
                        icon={PointOfSaleRoundedIcon}
                        color="#f59e0b"
                        loading={loadingSummary}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <SummaryCard
                        label="Alertas de stock"
                        value={summary ? String(summary.lowStockCount) : "—"}
                        sub={summary?.lowStockCount ? "variantes con stock bajo" : undefined}
                        icon={WarningAmberRoundedIcon}
                        color="#ef4444"
                        loading={loadingSummary}
                    />
                </Grid>
            </Grid>

            {/* Gráficas */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <SalesBarChart
                        title="Ventas por vendedor"
                        data={sellerSales.map((s) => ({ label: s.sellerName, amount: s.totalAmount }))}
                        xKey="sellerName"
                        loading={loadingCharts}
                        color="#3b82f6"
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <SalesBarChart
                        title="Ventas por caja"
                        data={registerSales.map((r) => ({ label: r.registerName, amount: r.totalAmount }))}
                        xKey="registerName"
                        loading={loadingCharts}
                        color="#8b5cf6"
                    />
                </Grid>
            </Grid>

            {/* Alertas de stock */}
            <LowStockPanel alerts={alerts} loading={loadingAlerts} />

        </Box>
    );
}
