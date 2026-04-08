'use client';

import { useState, useEffect } from "react";
import axios from "axios";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormHelperText,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import AddRoundedIcon      from "@mui/icons-material/AddRounded";
import CheckRoundedIcon    from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon    from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon     from "@mui/icons-material/SaveRounded";
import {
    useAllColors, useCreateColor,
    useAllSizes, useCreateSize,
    useAllCategoriesSelect,
    useCreateProductVariant, useCreateProductVariantImage,
} from "../hooks/productsHooks";
import { ProductService } from "../services/products.service";
import { CreateProductsVariant } from "../types/productsVariantTypes";
import { Color } from "../types/colorsTypes";
import { Size }  from "../types/sizesTypes";
import {
    ImageLightbox,
    VariantAddMoreImagesButton,
    VariantImageThumb,
    VariantPrimaryImageDropSlot,
    VARIANT_PRIMARY_IMAGE_SIZE,
} from "./variantImageUi";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type FormErrors = Record<string, string>;

function SectionTitle({ children, sx }: { children: React.ReactNode; sx?: object }) {
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
                ...sx,
            }}
        >
            {children}
        </Typography>
    );
}

function newRowId(): string {
    return typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random()}`;
}

interface VariantDraft {
    rowId: string;
    selectedColor: Color | null;
    showNewColor: boolean;
    newColorName: string;
    newColorHex: string;
    selectedSize: Size | null;
    showNewSize: boolean;
    newSizeName: string;
    stock: string;
    minStock: string;
    sku: string;
    imageFiles: File[];
    imagePreviews: { url: string; name: string }[];
}

function emptyVariant(): VariantDraft {
    return {
        rowId: newRowId(),
        selectedColor: null,
        showNewColor: false,
        newColorName: "",
        newColorHex: "#3b82f6",
        selectedSize: null,
        showNewSize: false,
        newSizeName: "",
        stock: "",
        minStock: "5",
        sku: "",
        imageFiles: [],
        imagePreviews: [],
    };
}

export default function CreateProduct({ open, onClose, onSuccess }: Props) {
    const theme = useTheme();

    const [name, setName]                 = useState("");
    const [purchasePrice, setPurchasePrice] = useState("");
    const [salePrice, setSalePrice]       = useState("");
    const [minStock, setMinStock]         = useState("");
    const [categoryId, setCategoryId]     = useState<number | "">("");

    const [variants, setVariants] = useState<VariantDraft[]>(() => [emptyVariant()]);

    const [errors, setErrors]         = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [imageLightbox, setImageLightbox] = useState<{ src: string; alt: string } | null>(null);

    const { data: colors,     loading: colorsLoading }     = useAllColors(open);
    const { data: sizes,      loading: sizesLoading }      = useAllSizes(open);
    const { data: categories, loading: catsLoading }       = useAllCategoriesSelect(open);

    const { execute: createColor }   = useCreateColor();
    const { execute: createSize }    = useCreateSize();
    const { execute: createVariant } = useCreateProductVariant();
    const { execute: uploadImage }   = useCreateProductVariantImage();

    useEffect(() => {
        if (!open) return;
        setName(""); setPurchasePrice(""); setSalePrice("");
        setMinStock("");
        setCategoryId("");
        setVariants([emptyVariant()]);
        setErrors({}); setSubmitError(null);
    }, [open]);

    const handleClose = () => {
        (document.activeElement as HTMLElement)?.blur();
        queueMicrotask(() => {
            onClose();
        });
    };

    const totalDraftStock = variants.reduce((s, vd) => s + (parseInt(vd.stock, 10) || 0), 0);
    const minStockWarning = (() => {
        const ms = parseInt(minStock, 10);
        if (!ms || ms <= 0) return null;
        if (ms > totalDraftStock)
            return `El stock mínimo supera el stock de las variantes (${totalDraftStock} unid.). Considera aumentar el stock.`;
        return null;
    })();

    const setV = (rowId: string, patch: Partial<VariantDraft>) => {
        setVariants((prev) => prev.map((v) => (v.rowId === rowId ? { ...v, ...patch } : v)));
    };

    const addVariantRow = () => setVariants((prev) => [...prev, emptyVariant()]);
    const removeVariantRow = (rowId: string) =>
        setVariants((prev) => (prev.length <= 1 ? prev : prev.filter((v) => v.rowId !== rowId)));

    const addVariantImages = (rowId: string, files: File[]) => {
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (!imageFiles.length) return;
        const previews = imageFiles.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
        setVariants((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            return {
                ...v,
                imageFiles: [...v.imageFiles, ...imageFiles],
                imagePreviews: [...v.imagePreviews, ...previews],
            };
        }));
    };

    const handleImageChange = (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        addVariantImages(rowId, files);
        e.target.value = "";
    };

    const removeImageAt = (rowId: string, index: number) => {
        setVariants((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            return {
                ...v,
                imageFiles: v.imageFiles.filter((_, i) => i !== index),
                imagePreviews: v.imagePreviews.filter((_, i) => i !== index),
            };
        }));
    };

    const makeVariantImageMain = (rowId: string, index: number) => {
        if (index === 0) return;
        setVariants((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            const files = [...v.imageFiles];
            const previews = [...v.imagePreviews];
            [files[0], files[index]] = [files[index], files[0]];
            [previews[0], previews[index]] = [previews[index], previews[0]];
            return { ...v, imageFiles: files, imagePreviews: previews };
        }));
    };

    const validate = (): boolean => {
        const errs: FormErrors = {};
        if (!name.trim())                             errs.name          = "Requerido";
        if (!purchasePrice || Number(purchasePrice) <= 0) errs.purchasePrice = "Ingresa un precio válido";
        if (!salePrice     || Number(salePrice)     <= 0) errs.salePrice     = "Ingresa un precio válido";
        if (!minStock      || Number(minStock)      <  0) errs.minStock      = "Requerido";
        if (!categoryId)                              errs.categoryId    = "Requerido";

        variants.forEach((vd, i) => {
            const p = `v${i}`;
            if (vd.showNewColor && !vd.newColorName.trim()) errs[`${p}_newColorName`] = "Ingresa el nombre del color";
            if (vd.showNewSize && !vd.newSizeName.trim())   errs[`${p}_newSizeName`]  = "Ingresa el nombre de la talla";
            if (!vd.stock || Number(vd.stock) < 0)         errs[`${p}_stock`]        = "Requerido";
            if (!vd.sku.trim())                             errs[`${p}_sku`]          = "Requerido";
        });

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const resolveColorId = async (vd: VariantDraft): Promise<number | undefined> => {
        if (vd.showNewColor) {
            if (!vd.newColorName.trim()) return undefined;
            const color = await createColor({ name: vd.newColorName.trim(), hexCode: vd.newColorHex });
            if (!color) throw new Error("color");
            return color.id;
        }
        if (vd.selectedColor) return vd.selectedColor.id;
        return undefined;
    };

    const resolveSizeId = async (vd: VariantDraft): Promise<number | undefined> => {
        if (vd.showNewSize) {
            if (!vd.newSizeName.trim()) return undefined;
            const size = await createSize({ name: vd.newSizeName.trim() });
            if (!size) throw new Error("size");
            return size.id;
        }
        if (vd.selectedSize) return vd.selectedSize.id;
        return undefined;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            const product = await ProductService.createProduct({
                name:               name.trim(),
                purchasePrice:      parseFloat(purchasePrice),
                salePrice:          parseFloat(salePrice),
                categoryId:         categoryId as number,
                minStock:           parseInt(minStock, 10),
            });

            for (const vd of variants) {
                const colorId = await resolveColorId(vd);
                const sizeId  = await resolveSizeId(vd);

                const payload: CreateProductsVariant = {
                    productId: product.id,
                    stock:     parseInt(vd.stock, 10),
                    minStock:  parseInt(vd.minStock, 10) || 5,
                    sku:       vd.sku.trim(),
                };
                if (colorId !== undefined) payload.colorId = colorId;
                if (sizeId !== undefined) payload.sizeId = sizeId;

                const variant = await createVariant(payload);
                if (!variant) throw new Error("variant");

                if (vd.imageFiles.length > 0) {
                    await uploadImage(variant.id, vd.imageFiles);
                }
            }

            onSuccess();
            handleClose();
        } catch (err) {
            console.error("[CreateProduct]", err);
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                setSubmitError(
                    err.response.data?.message ??
                    "Ya existe una variante activa con esa combinación de color y talla."
                );
            } else {
                setSubmitError("Ocurrió un error al crear el producto. Verifica los datos e intenta de nuevo.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const variantCardBg =
        theme.palette.mode === "dark"
            ? alpha(theme.palette.common.white, 0.04)
            : alpha(theme.palette.common.black, 0.03);

    return (
        <>
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            closeAfterTransition={false}
            disableRestoreFocus
            slotProps={{
                paper: {
                    sx: {
                        /** Márgenes en móvil: modal flotante, no tapa todo el viewport */
                        m: { xs: 2, sm: 3 },
                        maxHeight: { xs: "calc(100vh - 32px)", sm: "calc(100vh - 48px)" },
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 2,
                    },
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    pr: 1,
                    py: 2,
                    px: { xs: 1.5, sm: 3 },
                    borderBottom: 1,
                    borderColor: "divider",
                    flexShrink: 0,
                }}
            >
                <Typography
                    component="span"
                    variant="h6"
                    fontWeight={800}
                    letterSpacing="0.06em"
                    sx={{ color: "primary.main", fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}
                >
                    Nuevo producto
                </Typography>
                <IconButton size="small" onClick={handleClose} disabled={submitting} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent
                dividers
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0,
                    pt: 2.5,
                    px: { xs: 1.5, sm: 3 },
                    overflowX: "hidden",
                    flex: 1,
                    minHeight: 0,
                }}
            >
                {submitError && <Alert severity="error" sx={{ mb: 2.5 }}>{submitError}</Alert>}

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                        gap: { xs: 2.5, md: 4 },
                        alignItems: "start",
                        mb: 1,
                    }}
                >
                    <Stack spacing={2}>
                        <Box>
                            <SectionTitle>Información básica</SectionTitle>
                            <TextField
                                label="Nombre del producto"
                                placeholder="Ej. Polera básica algodón"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                fullWidth
                                size="small"
                                required
                                error={!!errors.name}
                                helperText={errors.name}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                                Completa el nombre y el stock mínimo global del producto; el detalle por color/talla va en variantes.
                            </Typography>
                        </Box>
                        <Box>
                            <SectionTitle>Stock mínimo (producto)</SectionTitle>
                            <TextField
                                label="Stock mínimo"
                                value={minStock}
                                onChange={(e) => setMinStock(e.target.value)}
                                size="small"
                                required
                                type="number"
                                sx={{ width: "100%", maxWidth: { sm: 280 } }}
                                error={!!errors.minStock}
                                helperText={errors.minStock ?? minStockWarning ?? "Alerta cuando el inventario total del producto esté bajo este umbral."}
                                slotProps={{
                                    formHelperText: {
                                        sx: !errors.minStock && minStockWarning ? { color: "warning.main" } : {},
                                    },
                                }}
                            />
                        </Box>
                    </Stack>

                    <Stack spacing={2}>
                        <Box>
                            <SectionTitle>Categoría</SectionTitle>
                            <FormControl fullWidth size="small" required error={!!errors.categoryId}>
                                <Autocomplete
                                    options={categories}
                                    getOptionLabel={(option) => option.name}
                                    getOptionKey={(option) => option.id}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Elegir categoría" placeholder="Buscar…" />
                                    )}
                                    onChange={(_, value) => setCategoryId(value?.id ?? "")}
                                    loading={catsLoading}
                                />
                                {errors.categoryId && <FormHelperText>{errors.categoryId}</FormHelperText>}
                            </FormControl>
                        </Box>
                        <Box>
                            <SectionTitle>Precios</SectionTitle>
                            <Stack spacing={2}>
                                <TextField
                                    label="Precio de compra"
                                    value={purchasePrice}
                                    onChange={(e) => setPurchasePrice(e.target.value)}
                                    fullWidth
                                    size="small"
                                    required
                                    type="number"
                                    slotProps={{
                                        input: {
                                            startAdornment: <InputAdornment position="start">S/</InputAdornment>,
                                        },
                                    }}
                                    error={!!errors.purchasePrice}
                                    helperText={errors.purchasePrice}
                                />
                                <TextField
                                    label="Precio de venta"
                                    value={salePrice}
                                    onChange={(e) => setSalePrice(e.target.value)}
                                    fullWidth
                                    size="small"
                                    required
                                    type="number"
                                    slotProps={{
                                        input: {
                                            startAdornment: <InputAdornment position="start">S/</InputAdornment>,
                                        },
                                    }}
                                    error={!!errors.salePrice}
                                    helperText={errors.salePrice}
                                />
                            </Stack>
                        </Box>
                    </Stack>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                        flexDirection: { xs: "column", sm: "row" },
                        mb: 1.5,
                    }}
                >
                    <Box sx={{ minWidth: 0, flex: { sm: 1 } }}>
                        <SectionTitle sx={{ mb: 0.5 }}>Variantes</SectionTitle>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                            Cada variante se guarda al crear el producto. Color y talla son opcionales; <strong>stock inicial</strong> y{" "}
                            <strong>SKU</strong> son obligatorios. Puedes añadir varias antes de guardar.
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddRoundedIcon />}
                        onClick={addVariantRow}
                        disabled={submitting}
                        sx={{
                            flexShrink: 0,
                            alignSelf: { xs: "stretch", sm: "auto" },
                            borderColor: "primary.main",
                            color: "primary.main",
                            fontWeight: 700,
                        }}
                    >
                        Agregar variante
                    </Button>
                </Box>

                {variants.map((vd, vi) => {
                    const ep = `v${vi}`;
                    const fileInputId = `file-${vd.rowId}`;
                    const firstPreview = vd.imagePreviews[0];
                    const restPreviews = vd.imagePreviews.slice(1);
                    return (
                        <Box
                            key={vd.rowId}
                            sx={{
                                mb: 2.5,
                                p: { xs: 1.5, sm: 2.5 },
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 2,
                                bgcolor: variantCardBg,
                            }}
                        >
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    Variante {vi + 1}
                                </Typography>
                                {variants.length > 1 && (
                                    <IconButton size="small" onClick={() => removeVariantRow(vd.rowId)} aria-label="Quitar variante">
                                        <DeleteOutlineRoundedIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                    gap: 2.5,
                                    alignItems: "start",
                                }}
                            >
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
                                        Color <Typography component="span" variant="caption" fontWeight={400}>(opcional)</Typography>
                                    </Typography>
                                    {colorsLoading ? (
                                        <CircularProgress size={22} sx={{ mb: 1 }} />
                                    ) : (
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                            {colors.map((c) => (
                                                <Tooltip key={c.id} title={c.name}>
                                                    <Box
                                                        onClick={() => setV(vd.rowId, { selectedColor: c, showNewColor: false })}
                                                        sx={{
                                                            width: 30, height: 30, borderRadius: "50%",
                                                            bgcolor: c.hexCode,
                                                            border: "2px solid",
                                                            borderColor: vd.selectedColor?.id === c.id ? "primary.main" : "divider",
                                                            cursor: "pointer",
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            boxShadow: vd.selectedColor?.id === c.id ? 3 : 0,
                                                            transition: "transform 0.15s",
                                                            "&:hover": { transform: "scale(1.18)" },
                                                        }}
                                                    >
                                                        {vd.selectedColor?.id === c.id && (
                                                            <CheckRoundedIcon sx={{ fontSize: 13, color: "white", filter: "drop-shadow(0 0 2px #0006)" }} />
                                                        )}
                                                    </Box>
                                                </Tooltip>
                                            ))}
                                            <Tooltip title={vd.showNewColor ? "Cancelar nuevo color" : "Crear nuevo color"}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setV(vd.rowId, { showNewColor: !vd.showNewColor, selectedColor: null })}
                                                    sx={{
                                                        width: 30, height: 30,
                                                        border: "2px dashed",
                                                        borderColor: vd.showNewColor ? "primary.main" : "divider",
                                                        borderRadius: "50%",
                                                    }}
                                                >
                                                    <AddRoundedIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )}

                                    {vd.showNewColor && (
                                        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mt: 1.5, alignItems: "flex-start" }}>
                                            <TextField
                                                label="Nombre del color" value={vd.newColorName}
                                                onChange={(e) => setV(vd.rowId, { newColorName: e.target.value })}
                                                size="small" sx={{ flex: 1, width: "100%" }}
                                                error={!!errors[`${ep}_newColorName`]} helperText={errors[`${ep}_newColorName`]}
                                            />
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                <Box
                                                    component="input"
                                                    type="color"
                                                    value={vd.newColorHex}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setV(vd.rowId, { newColorHex: e.target.value })}
                                                    sx={{
                                                        width: 38, height: 38, p: "2px",
                                                        border: "1px solid", borderColor: "divider",
                                                        borderRadius: 1, cursor: "pointer",
                                                        bgcolor: "transparent",
                                                    }}
                                                />
                                                <TextField
                                                    label="Hex" value={vd.newColorHex}
                                                    onChange={(e) => setV(vd.rowId, { newColorHex: e.target.value })}
                                                    size="small" sx={{ width: 110 }}
                                                    slotProps={{ input: { startAdornment: <InputAdornment position="start">#</InputAdornment> } }}
                                                />
                                            </Box>
                                        </Box>
                                    )}
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
                                        Talla <Typography component="span" variant="caption" fontWeight={400}>(opcional)</Typography>
                                    </Typography>
                                    {sizesLoading ? (
                                        <CircularProgress size={22} sx={{ mb: 1 }} />
                                    ) : (
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                            {sizes.map((s) => (
                                                <Chip
                                                    key={s.id} label={s.name}
                                                    onClick={() => setV(vd.rowId, { selectedSize: s, showNewSize: false })}
                                                    color={vd.selectedSize?.id === s.id ? "primary" : "default"}
                                                    variant={vd.selectedSize?.id === s.id ? "filled" : "outlined"}
                                                    size="small" sx={{ cursor: "pointer" }}
                                                />
                                            ))}
                                            <Chip
                                                icon={<AddRoundedIcon />}
                                                label="Nueva talla"
                                                onClick={() => setV(vd.rowId, { showNewSize: !vd.showNewSize, selectedSize: null })}
                                                variant="outlined"
                                                size="small"
                                                color={vd.showNewSize ? "primary" : "default"}
                                                sx={{ cursor: "pointer" }}
                                            />
                                        </Box>
                                    )}

                                    {vd.showNewSize && (
                                        <TextField
                                            label="Nombre de la talla" value={vd.newSizeName}
                                            onChange={(e) => setV(vd.rowId, { newSizeName: e.target.value })}
                                            size="small" sx={{ mt: 1.5, width: "100%", maxWidth: 280 }}
                                            error={!!errors[`${ep}_newSizeName`]} helperText={errors[`${ep}_newSizeName`]}
                                        />
                                    )}
                                </Box>
                            </Box>

                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2.5, alignItems: "flex-start" }}>
                                <TextField
                                    label="Stock inicial"
                                    value={vd.stock}
                                    onChange={(e) => setV(vd.rowId, { stock: e.target.value })}
                                    size="small"
                                    required
                                    type="number"
                                    sx={{ width: { xs: "100%", sm: 140 } }}
                                    error={!!errors[`${ep}_stock`]}
                                    helperText={errors[`${ep}_stock`]}
                                />
                                <TextField
                                    label="Stock mínimo (variante)"
                                    value={vd.minStock}
                                    onChange={(e) => setV(vd.rowId, { minStock: e.target.value })}
                                    size="small"
                                    type="number"
                                    sx={{ width: { xs: "100%", sm: 160 } }}
                                    slotProps={{ htmlInput: { min: 1 } }}
                                    helperText="Alerta por variante"
                                />
                                <TextField
                                    label="SKU *"
                                    value={vd.sku}
                                    onChange={(e) => setV(vd.rowId, { sku: e.target.value })}
                                    size="small"
                                    required
                                    sx={{ flex: "1 1 200px", minWidth: 160 }}
                                    error={!!errors[`${ep}_sku`]}
                                    helperText={errors[`${ep}_sku`] ?? "Identificador único de esta variante"}
                                />
                            </Box>

                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
                                Imágenes <Typography component="span" variant="caption" fontWeight={400}>(opcional)</Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                                La primera foto será la imagen principal al crear la variante. La estrella vacía en otra miniatura la pone primera; «Agregar imágenes» añade más (o elige varias en el selector).
                            </Typography>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start" }}>
                                {!firstPreview ? (
                                    <VariantPrimaryImageDropSlot
                                        inputId={fileInputId}
                                        onDropFiles={(files) => addVariantImages(vd.rowId, files)}
                                        disabled={submitting}
                                    />
                                ) : (
                                    <VariantImageThumb
                                        size={VARIANT_PRIMARY_IMAGE_SIZE}
                                        src={firstPreview.url}
                                        alt={firstPreview.name}
                                        isMain
                                        onExpand={() => setImageLightbox({ src: firstPreview.url, alt: firstPreview.name })}
                                        onRemove={() => removeImageAt(vd.rowId, 0)}
                                    />
                                )}
                                {restPreviews.map((p, i) => (
                                    <VariantImageThumb
                                        key={`${p.name}-${i + 1}`}
                                        src={p.url}
                                        alt={p.name}
                                        onExpand={() => setImageLightbox({ src: p.url, alt: p.name })}
                                        onRemove={() => removeImageAt(vd.rowId, i + 1)}
                                        onSetAsMain={() => makeVariantImageMain(vd.rowId, i + 1)}
                                        setAsMainDisabled={submitting}
                                    />
                                ))}
                                {firstPreview ? (
                                    <VariantAddMoreImagesButton inputId={fileInputId} disabled={submitting} />
                                ) : null}
                            </Box>
                            <input
                                id={fileInputId}
                                type="file"
                                accept="image/*"
                                multiple
                                hidden
                                onChange={(e) => handleImageChange(vd.rowId, e)}
                            />
                        </Box>
                    );
                })}
            </DialogContent>

            <DialogActions
                sx={{
                    px: { xs: 1.5, sm: 3 },
                    py: 2,
                    borderTop: 1,
                    borderColor: "divider",
                    gap: 1,
                    flexShrink: 0,
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: { xs: "stretch", sm: "flex-end" },
                    "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                }}
            >
                <Button variant="outlined" onClick={handleClose} disabled={submitting}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    loading={submitting}
                    disabled={submitting}
                    startIcon={<SaveRoundedIcon />}
                >
                    Crear producto
                </Button>
            </DialogActions>
        </Dialog>

        <ImageLightbox
            open={imageLightbox !== null}
            src={imageLightbox?.src ?? ""}
            alt={imageLightbox?.alt ?? ""}
            onClose={() => setImageLightbox(null)}
        />
        </>
    );
}
