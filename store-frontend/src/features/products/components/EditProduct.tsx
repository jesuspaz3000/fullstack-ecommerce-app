'use client';

import { useState, useEffect, useRef, useMemo } from "react";
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
import AddRoundedIcon         from "@mui/icons-material/AddRounded";
import CheckRoundedIcon       from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon       from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon          from "@mui/icons-material/SaveRounded";
import {
    useUpdateProduct,
    useAllCategoriesSelect,
    useAllColors, useCreateColor,
    useAllSizes,  useCreateSize,
    useUpdateProductVariant,
    useCreateProductVariant,
    useCreateProductVariantImage,
    useDeleteProductVariant,
    useSetMainProductVariantImage,
} from "../hooks/productsHooks";
import { ProductService }               from "../services/products.service";
import { ProductsVariantImageService }  from "../services/productsVariantImage.service";
import { Product }                      from "../types/productsTypes";
import { CreateProductsVariant }        from "../types/productsVariantTypes";
import { Color }                        from "../types/colorsTypes";
import { Size }                         from "../types/sizesTypes";
import { toMediaUrl }                   from "@/shared/utils/mediaUrl";
import {
    ImageLightbox,
    VariantAddMoreImagesButton,
    VariantImageThumb,
    VariantPrimaryImageDropSlot,
    VARIANT_PRIMARY_IMAGE_SIZE,
} from "./variantImageUi";

// ─── Image URL helper ──────────────────────────────────────────────────────────
const imgUrl = (path: string) => toMediaUrl(path);

// ─── Per-variant edit state ────────────────────────────────────────────────────
interface VariantEdit {
    selectedColorId: number | null;
    showNewColor:    boolean;
    newColorName:    string;
    newColorHex:     string;
    selectedSizeId:  number | null;
    showNewSize:     boolean;
    newSizeName:     string;
    stock:           string;
    minStock:        string;
    sku:             string;
}

interface Props {
    open:      boolean;
    product:   Product | null;
    onClose:   () => void;
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

function newDraftRowId(): string {
    return typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `nd-${Date.now()}-${Math.random()}`;
}

/** Borradores de variantes nuevas (se persisten al pulsar Guardar cambios). */
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

function emptyVariantDraft(): VariantDraft {
    return {
        rowId: newDraftRowId(),
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

function isSkippableVariantDraft(vd: VariantDraft): boolean {
    return (
        !vd.sku.trim() &&
        vd.stock.trim() === "" &&
        vd.imageFiles.length === 0 &&
        !vd.selectedColor &&
        !vd.selectedSize &&
        !vd.showNewColor &&
        !vd.showNewSize
    );
}

/** Stock en alerta cuando el actual es ≤ al mínimo de la variante (misma regla que el dashboard). */
function isVariantStockAtOrBelowMin(stockStr: string, minStockStr: string): boolean {
    const stock = parseInt(stockStr, 10);
    const min = parseInt(minStockStr, 10);
    if (Number.isNaN(stock) || Number.isNaN(min) || min < 0) return false;
    return stock <= min;
}

export default function EditProduct({ open, product, onClose, onSuccess }: Props) {
    const theme = useTheme();

    // ── Hooks ──────────────────────────────────────────────────────────────────
    const { execute: updateProduct }   = useUpdateProduct();
    const { execute: updateVariant }   = useUpdateProductVariant();
    const { execute: deleteVariantById } = useDeleteProductVariant();
    const { execute: createVariant }   = useCreateProductVariant();
    const { execute: uploadImages }    = useCreateProductVariantImage();
    const { execute: setMainVariantImage, loading: settingMainImage } = useSetMainProductVariantImage();
    const { execute: createColor }     = useCreateColor();
    const { execute: createSize }      = useCreateSize();

    const { data: categories, loading: catsLoading }      = useAllCategoriesSelect(open);
    const { data: colors,     loading: colorsLoading }    = useAllColors(open);
    const { data: sizes,      loading: sizesLoading }     = useAllSizes(open);

    // ── Fresh product state ────────────────────────────────────────────────────
    const [productDetail, setProductDetail]   = useState<Product | null>(null);
    const [loadingDetail, setLoadingDetail]   = useState(false);

    // ── Product fields ─────────────────────────────────────────────────────────
    const [name, setName]                   = useState("");
    const [purchasePrice, setPurchasePrice] = useState("");
    const [salePrice, setSalePrice]         = useState("");
    const [minStock, setMinStock]           = useState("");
    const [categoryId, setCategoryId]       = useState<number | "">("");
    const [errors, setErrors]               = useState<FormErrors>({});

    // ── Variant edits (per variantId) ──────────────────────────────────────────
    const [variantEdits, setVariantEdits] = useState<Record<number, VariantEdit>>({});

    // ── Image management ───────────────────────────────────────────────────────
    const [pendingDeleteImageIds, setPendingDeleteImageIds] = useState<number[]>([]);
    /** Archivos nuevos por variante (se suben al guardar). */
    const [pendingUploadsByVariant, setPendingUploadsByVariant] = useState<
        Record<number, { files: File[]; previews: { url: string; name: string }[] }>
    >({});
    const variantImagePickerRef = useRef<HTMLInputElement>(null);
    const pendingPickerVariantIdRef = useRef<number | null>(null);

    const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
    /** Confirmación antes de desactivar una variante (DELETE API). */
    const [variantIdPendingDelete, setVariantIdPendingDelete] = useState<number | null>(null);
    const [deletingVariant, setDeletingVariant] = useState(false);

    // ── Submit state ───────────────────────────────────────────────────────────
    const [submitting, setSubmitting]   = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [imageLightbox, setImageLightbox] = useState<{ src: string; alt: string } | null>(null);

    // ── Stock warning ──────────────────────────────────────────────────────────
    const totalStockInForm = useMemo(() => {
        const fromEdits  = Object.values(variantEdits).reduce((s, e) => s + (parseInt(e.stock, 10) || 0), 0);
        const fromDrafts = variantDrafts.reduce((s, vd) => s + (parseInt(vd.stock, 10) || 0), 0);
        return fromEdits + fromDrafts;
    }, [variantEdits, variantDrafts]);

    const minStockWarning = (() => {
        const ms = parseInt(minStock, 10);
        if (!ms || ms <= 0) return null;
        if (ms > totalStockInForm)
            return `El stock mínimo supera el stock total actual (${totalStockInForm} unid.). Considera aumentar el stock de las variantes.`;
        return null;
    })();

    // ── Fetch product by ID ────────────────────────────────────────────────────
    const loadProduct = async (id: number) => {
        setLoadingDetail(true);
        try {
            const fresh = await ProductService.getProduct(id);
            setProductDetail(fresh);
            setPendingUploadsByVariant({});

            // Pre-fill product fields
            setName(fresh.name);
            setPurchasePrice(String(fresh.purchasePrice));
            setSalePrice(String(fresh.salePrice));
            setMinStock(String(fresh.minStock));
            setCategoryId(fresh.categoryId);

            // Init variant edit states (solo variantes activas en la UI)
            const edits: Record<number, VariantEdit> = {};
            fresh.variants.filter((v) => v.isActive !== false).forEach((v) => {
                edits[v.id] = {
                    selectedColorId: v.colorId ?? null,
                    showNewColor:    false,
                    newColorName:    "",
                    newColorHex:     "#3b82f6",
                    selectedSizeId:  v.sizeId ?? null,
                    showNewSize:     false,
                    newSizeName:     "",
                    stock:           String(v.stock),
                    minStock:        String(v.minStock ?? 5),
                    sku:             v.sku,
                };
            });
            setVariantEdits(edits);

            setVariantDrafts([]);
        } catch (err) {
            console.error("[EditProduct] load", err);
        } finally {
            setLoadingDetail(false);
        }
    };

    useEffect(() => {
        if (!open || !product?.id) return;
        setErrors({});
        setSubmitError(null);
        setPendingDeleteImageIds([]);
        setPendingUploadsByVariant({});
        loadProduct(product.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, product?.id]);

    const handleClose = () => {
        (document.activeElement as HTMLElement)?.blur();
        queueMicrotask(() => {
            onClose();
        });
    };

    // ── Variant edit helper ────────────────────────────────────────────────────
    const setVEdit = (variantId: number, changes: Partial<VariantEdit>) =>
        setVariantEdits((prev) => ({ ...prev, [variantId]: { ...prev[variantId], ...changes } }));

    // ── Deferred image deletion ────────────────────────────────────────────────
    const markForDeletion = (imageId: number) =>
        setPendingDeleteImageIds((prev) => [...prev, imageId]);

    const appendPendingVariantImages = (variantId: number, files: File[]) => {
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (!imageFiles.length) return;
        setPendingUploadsByVariant((prev) => {
            const cur = prev[variantId] ?? { files: [], previews: [] };
            const addPreviews = imageFiles.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
            return {
                ...prev,
                [variantId]: {
                    files: [...cur.files, ...imageFiles],
                    previews: [...cur.previews, ...addPreviews],
                },
            };
        });
    };

    const handleVariantImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const variantId = pendingPickerVariantIdRef.current;
        pendingPickerVariantIdRef.current = null;
        const files = Array.from(e.target.files ?? []);
        if (variantImagePickerRef.current) variantImagePickerRef.current.value = "";
        if (variantId == null || !files.length) return;
        appendPendingVariantImages(variantId, files);
    };

    const makePendingImageMain = (variantId: number, index: number) => {
        if (index === 0) return;
        setPendingUploadsByVariant((prev) => {
            const cur = prev[variantId];
            if (!cur) return prev;
            const files = [...cur.files];
            const previews = [...cur.previews];
            [files[0], files[index]] = [files[index], files[0]];
            [previews[0], previews[index]] = [previews[index], previews[0]];
            return { ...prev, [variantId]: { files, previews } };
        });
    };

    const removePendingVariantImageAt = (variantId: number, index: number) => {
        setPendingUploadsByVariant((prev) => {
            const cur = prev[variantId];
            if (!cur) return prev;
            const removed = cur.previews[index];
            if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
            const nextFiles = cur.files.filter((_, i) => i !== index);
            const nextPreviews = cur.previews.filter((_, i) => i !== index);
            const next = { ...prev };
            if (nextFiles.length === 0) delete next[variantId];
            else next[variantId] = { files: nextFiles, previews: nextPreviews };
            return next;
        });
    };

    const setDraft = (rowId: string, patch: Partial<VariantDraft>) => {
        setVariantDrafts((prev) => prev.map((v) => (v.rowId === rowId ? { ...v, ...patch } : v)));
    };

    const addVariantDraftRow = () => setVariantDrafts((prev) => [...prev, emptyVariantDraft()]);

    const removeVariantDraftRow = (rowId: string) => {
        setVariantDrafts((prev) => {
            const row = prev.find((v) => v.rowId === rowId);
            row?.imagePreviews.forEach((p) => {
                if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
            });
            return prev.filter((v) => v.rowId !== rowId);
        });
    };

    const appendDraftImages = (rowId: string, files: File[]) => {
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (!imageFiles.length) return;
        const previews = imageFiles.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
        setVariantDrafts((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            return {
                ...v,
                imageFiles: [...v.imageFiles, ...imageFiles],
                imagePreviews: [...v.imagePreviews, ...previews],
            };
        }));
    };

    const handleDraftImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const prefix = "draft-file-";
        const rowId = input.id.startsWith(prefix) ? input.id.slice(prefix.length) : null;
        const files = Array.from(input.files ?? []);
        input.value = "";
        if (!rowId || !files.length) return;
        appendDraftImages(rowId, files);
    };

    const removeDraftImageAt = (rowId: string, index: number) => {
        setVariantDrafts((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            const removed = v.imagePreviews[index];
            if (removed?.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
            return {
                ...v,
                imageFiles: v.imageFiles.filter((_, i) => i !== index),
                imagePreviews: v.imagePreviews.filter((_, i) => i !== index),
            };
        }));
    };

    const makeDraftImageMain = (rowId: string, index: number) => {
        if (index === 0) return;
        setVariantDrafts((prev) => prev.map((v) => {
            if (v.rowId !== rowId) return v;
            const files = [...v.imageFiles];
            const previews = [...v.imagePreviews];
            [files[0], files[index]] = [files[index], files[0]];
            [previews[0], previews[index]] = [previews[index], previews[0]];
            return { ...v, imageFiles: files, imagePreviews: previews };
        }));
    };

    const handleServerImageSetMain = async (imageId: number) => {
        const ok = await setMainVariantImage(imageId);
        if (!ok) return;
        setProductDetail((prev) => {
            if (!prev) return prev;
            let targetVariantId: number | null = null;
            for (const vv of prev.variants) {
                if (vv.images.some((im) => im.id === imageId)) {
                    targetVariantId = vv.id;
                    break;
                }
            }
            if (targetVariantId == null) return prev;
            return {
                ...prev,
                variants: prev.variants.map((vv) => {
                    if (vv.id !== targetVariantId) return vv;
                    const nextImages = vv.images
                        .map((im) => ({ ...im, isMain: im.id === imageId }))
                        .sort((a, b) => {
                            if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
                            return a.id - b.id;
                        });
                    return { ...vv, images: nextImages };
                }),
            };
        });
    };

    const resolveDraftColorId = async (vd: VariantDraft): Promise<number | undefined> => {
        if (vd.showNewColor) {
            if (!vd.newColorName.trim()) return undefined;
            const color = await createColor({ name: vd.newColorName.trim(), hexCode: vd.newColorHex });
            if (!color) throw new Error("color");
            return color.id;
        }
        if (vd.selectedColor) return vd.selectedColor.id;
        return undefined;
    };

    const resolveDraftSizeId = async (vd: VariantDraft): Promise<number | undefined> => {
        if (vd.showNewSize) {
            if (!vd.newSizeName.trim()) return undefined;
            const size = await createSize({ name: vd.newSizeName.trim() });
            if (!size) throw new Error("size");
            return size.id;
        }
        if (vd.selectedSize) return vd.selectedSize.id;
        return undefined;
    };

    const activeVariants = useMemo(
        () => (productDetail?.variants ?? []).filter((v) => v.isActive !== false),
        [productDetail],
    );

    const handleConfirmDeleteVariant = async () => {
        if (variantIdPendingDelete == null || !product?.id || !productDetail) return;
        const vid = variantIdPendingDelete;
        const removed = productDetail.variants.find((v) => v.id === vid);
        const imageIdsFromVariant = removed?.images.map((img) => img.id) ?? [];
        setDeletingVariant(true);
        setSubmitError(null);
        try {
            const ok = await deleteVariantById(vid);
            if (!ok) {
                setSubmitError("No se pudo eliminar la variante.");
                return;
            }
            setVariantIdPendingDelete(null);
            setPendingDeleteImageIds((prev) => prev.filter((id) => !imageIdsFromVariant.includes(id)));
            setPendingUploadsByVariant((prev) => {
                const next = { ...prev };
                delete next[vid];
                return next;
            });
            await loadProduct(product.id);
        } finally {
            setDeletingVariant(false);
        }
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): boolean => {
        const errs: FormErrors = {};
        if (!name.trim())                                 errs.name          = "Requerido";
        if (!purchasePrice || Number(purchasePrice) <= 0) errs.purchasePrice = "Ingresa un precio válido";
        if (!salePrice     || Number(salePrice)     <= 0) errs.salePrice     = "Ingresa un precio válido";
        if (!minStock      || Number(minStock)      <  0) errs.minStock      = "Requerido";
        if (!categoryId)                                  errs.categoryId    = "Requerido";

        variantDrafts.forEach((vd, i) => {
            if (isSkippableVariantDraft(vd)) return;
            const p = `nd${i}`;
            if (vd.showNewColor && !vd.newColorName.trim()) errs[`${p}_newColorName`] = "Ingresa el nombre del color";
            if (vd.showNewSize && !vd.newSizeName.trim())   errs[`${p}_newSizeName`]  = "Ingresa el nombre de la talla";
            if (!vd.stock.trim() || Number(vd.stock) < 0)   errs[`${p}_stock`]        = "Requerido";
            if (!vd.sku.trim())                             errs[`${p}_sku`]          = "Requerido";
        });

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!product || !productDetail || !validate()) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            // 1 ─ Update product fields
            await updateProduct(product.id, {
                name:          name.trim(),
                purchasePrice: parseFloat(purchasePrice),
                salePrice:     parseFloat(salePrice),
                isFeatured:    productDetail.isFeatured,
                categoryId:    categoryId as number,
                minStock:      parseInt(minStock, 10),
            });

            // 2 ─ Update each variant if color / size / stock / sku changed
            for (const v of activeVariants) {
                const edit = variantEdits[v.id];
                if (!edit) continue;

                let resolvedColorId: number | undefined;
                if (edit.showNewColor && edit.newColorName.trim()) {
                    const c = await createColor({ name: edit.newColorName.trim(), hexCode: edit.newColorHex });
                    if (!c) throw new Error("Error al crear el color");
                    resolvedColorId = c.id;
                } else if (edit.selectedColorId != null) {
                    resolvedColorId = edit.selectedColorId;
                }

                let resolvedSizeId: number | undefined;
                if (edit.showNewSize && edit.newSizeName.trim()) {
                    const s = await createSize({ name: edit.newSizeName.trim() });
                    if (!s) throw new Error("Error al crear la talla");
                    resolvedSizeId = s.id;
                } else if (edit.selectedSizeId != null) {
                    resolvedSizeId = edit.selectedSizeId;
                }

                const stockVal = parseInt(edit.stock, 10) || 0;
                const skuVal   = edit.sku.trim();
                const prevColor = v.colorId ?? null;
                const prevSize  = v.sizeId ?? null;
                const nextColor = resolvedColorId ?? null;
                const nextSize  = resolvedSizeId ?? null;
                const changed =
                    nextColor !== prevColor ||
                    nextSize !== prevSize ||
                    stockVal !== v.stock ||
                    skuVal !== v.sku;

                const minStockVal = parseInt(edit.minStock, 10) || 5;
                if (changed || minStockVal !== (v.minStock ?? 5)) {
                    await updateVariant(v.id, {
                        stock:    stockVal,
                        minStock: minStockVal,
                        sku:      skuVal,
                        ...(resolvedColorId !== undefined ? { colorId: resolvedColorId } : {}),
                        ...(resolvedSizeId !== undefined ? { sizeId: resolvedSizeId } : {}),
                    });
                }
            }

            // 3 ─ Delete pending images
            for (const imgId of pendingDeleteImageIds) {
                await ProductsVariantImageService.deleteProductsVariantImage(imgId);
            }

            // 4 ─ Upload new images (cada variante su propia lista)
            for (const v of activeVariants) {
                const pending = pendingUploadsByVariant[v.id];
                if (pending?.files.length) {
                    await uploadImages(v.id, pending.files);
                }
            }

            // 5 ─ Crear variantes nuevas desde borradores (solo las completas; vacías se omiten)
            for (const vd of variantDrafts) {
                if (isSkippableVariantDraft(vd)) continue;
                const colorId = await resolveDraftColorId(vd);
                const sizeId  = await resolveDraftSizeId(vd);
                const payload: CreateProductsVariant = {
                    productId: productDetail.id,
                    stock:     parseInt(vd.stock, 10),
                    minStock:  parseInt(vd.minStock, 10) || 5,
                    sku:       vd.sku.trim(),
                };
                if (colorId !== undefined) payload.colorId = colorId;
                if (sizeId !== undefined) payload.sizeId = sizeId;
                const created = await createVariant(payload);
                if (!created) throw new Error("variant");
                if (vd.imageFiles.length > 0) {
                    await uploadImages(created.id, vd.imageFiles);
                }
            }

            setVariantDrafts([]);
            onSuccess();
            handleClose();
        } catch (err) {
            console.error("[EditProduct] submit", err);
            setSubmitError("Ocurrió un error al guardar. Verifica los datos e intenta de nuevo.");
        } finally {
            setSubmitting(false);
        }
    };

    const isBusy = submitting || loadingDetail || deletingVariant;
    const imageThumbMainBusy = isBusy || settingMainImage;

    const variantCardBg =
        theme.palette.mode === "dark"
            ? alpha(theme.palette.common.white, 0.04)
            : alpha(theme.palette.common.black, 0.03);

    // ─────────────────────────────────────────────────────────────────────────
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
                    Editar producto
                </Typography>
                <IconButton size="small" onClick={handleClose} disabled={isBusy} aria-label="Cerrar">
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

                {loadingDetail ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
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
                                        Los cambios del producto y de cada variante se aplican al pulsar «Guardar cambios».
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
                                        helperText={
                                            errors.minStock ??
                                            minStockWarning ??
                                            "Alerta cuando el inventario total del producto esté bajo este umbral."
                                        }
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
                                            value={categories.find((c) => c.id === categoryId) ?? null}
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
                                    Edita variantes existentes o añade borradores con «Agregar variante». Las filas vacías se ignoran; las que tengan{" "}
                                    <strong>stock</strong> y <strong>SKU</strong> se crean al guardar.
                                </Typography>
                            </Box>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AddRoundedIcon />}
                                onClick={addVariantDraftRow}
                                disabled={isBusy}
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

                        {activeVariants.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                No hay variantes activas. Pulsa «Agregar variante» para añadir borradores o crea variantes al guardar.
                            </Typography>
                        )}

                        {activeVariants.map((v) => {
                            const edit = variantEdits[v.id];
                            if (!edit) return null;
                            const variantStockLow = isVariantStockAtOrBelowMin(edit.stock, edit.minStock);
                            const visible  = v.images.filter((img) => !pendingDeleteImageIds.includes(img.id));
                            const toDelete = v.images.length - visible.length;
                            const pending  = pendingUploadsByVariant[v.id];
                            const pendingPrev = pending?.previews ?? [];
                            const serverHero = visible[0];
                            const hasServerHero = Boolean(serverHero);
                            const hasAnyImage = visible.length > 0 || pendingPrev.length > 0;
                            const serverTail = visible.slice(1);
                            const pendingThumbs = hasServerHero
                                ? pendingPrev.map((p, idx) => ({ p, idx }))
                                : pendingPrev.slice(1).map((p, idx) => ({ p, idx: idx + 1 }));
                            const openVariantFilePicker = () => {
                                pendingPickerVariantIdRef.current = v.id;
                                variantImagePickerRef.current?.click();
                            };
                            return (
                                <Box
                                    key={v.id}
                                    sx={{
                                        mb: 2.5,
                                        p: { xs: 1.5, sm: 2.5 },
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderRadius: 2,
                                        bgcolor: variantCardBg,
                                    }}
                                >
                                    {/* Variant header */}
                                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 2 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", minWidth: 0 }}>
                                            <Box sx={{ width: 13, height: 13, borderRadius: "50%", bgcolor: v.colorHexCode ?? "action.hover", border: "1px solid", borderColor: "divider", flexShrink: 0 }} />
                                            <Typography variant="body2" fontWeight={600}>{v.colorName ?? "Sin color"} / {v.sizeName ?? "Sin talla"}</Typography>
                                            <Typography variant="caption" color="text.secondary">Stock: {v.stock} · SKU: {v.sku}</Typography>
                                        </Box>
                                        <Tooltip title="Eliminar variante">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                aria-label="Eliminar variante"
                                                onClick={() => setVariantIdPendingDelete(v.id)}
                                                disabled={isBusy}
                                            >
                                                <DeleteOutlineRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
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
                                            {colorsLoading ? <CircularProgress size={20} sx={{ mb: 1 }} /> : (
                                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                                    {colors.map((c: Color) => (
                                                        <Tooltip key={c.id} title={c.name}>
                                                            <Box
                                                                onClick={() => setVEdit(v.id, { selectedColorId: c.id, showNewColor: false })}
                                                                sx={{
                                                                    width: 28, height: 28, borderRadius: "50%",
                                                                    bgcolor: c.hexCode, border: "2px solid",
                                                                    borderColor: edit.selectedColorId === c.id ? "primary.main" : "divider",
                                                                    cursor: "pointer",
                                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                                    boxShadow: edit.selectedColorId === c.id ? 3 : 0,
                                                                    transition: "transform 0.15s",
                                                                    "&:hover": { transform: "scale(1.18)" },
                                                                }}
                                                            >
                                                                {edit.selectedColorId === c.id && (
                                                                    <CheckRoundedIcon sx={{ fontSize: 12, color: "white", filter: "drop-shadow(0 0 2px #0006)" }} />
                                                                )}
                                                            </Box>
                                                        </Tooltip>
                                                    ))}
                                                    <Tooltip title={edit.showNewColor ? "Cancelar" : "Nuevo color"}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setVEdit(v.id, { showNewColor: !edit.showNewColor, selectedColorId: edit.showNewColor ? (v.colorId ?? null) : null })}
                                                            sx={{ width: 28, height: 28, border: "2px dashed", borderColor: edit.showNewColor ? "primary.main" : "divider", borderRadius: "50%" }}
                                                        >
                                                            <AddRoundedIcon sx={{ fontSize: 13 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            )}

                                            {edit.showNewColor && (
                                                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mt: 1.5, alignItems: "flex-start" }}>
                                                    <TextField
                                                        label="Nombre del color" value={edit.newColorName}
                                                        onChange={(e) => setVEdit(v.id, { newColorName: e.target.value })}
                                                        size="small" sx={{ flex: 1, width: "100%" }}
                                                    />
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <Box
                                                            component="input" type="color" value={edit.newColorHex}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVEdit(v.id, { newColorHex: e.target.value })}
                                                            sx={{ width: 36, height: 36, p: "2px", border: "1px solid", borderColor: "divider", borderRadius: 1, cursor: "pointer", bgcolor: "transparent" }}
                                                        />
                                                        <TextField
                                                            label="Hex" value={edit.newColorHex}
                                                            onChange={(e) => setVEdit(v.id, { newColorHex: e.target.value })}
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
                                            {sizesLoading ? <CircularProgress size={20} sx={{ mb: 1 }} /> : (
                                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                                    {sizes.map((s: Size) => (
                                                        <Chip
                                                            key={s.id} label={s.name}
                                                            onClick={() => setVEdit(v.id, { selectedSizeId: s.id, showNewSize: false })}
                                                            color={edit.selectedSizeId === s.id ? "primary" : "default"}
                                                            variant={edit.selectedSizeId === s.id ? "filled" : "outlined"}
                                                            size="small" sx={{ cursor: "pointer" }}
                                                        />
                                                    ))}
                                                    <Chip
                                                        icon={<AddRoundedIcon />} label="Nueva talla"
                                                        onClick={() => setVEdit(v.id, { showNewSize: !edit.showNewSize, selectedSizeId: edit.showNewSize ? (v.sizeId ?? null) : null })}
                                                        variant="outlined" size="small"
                                                        color={edit.showNewSize ? "primary" : "default"}
                                                        sx={{ cursor: "pointer" }}
                                                    />
                                                </Box>
                                            )}

                                            {edit.showNewSize && (
                                                <TextField
                                                    label="Nombre de la talla" value={edit.newSizeName}
                                                    onChange={(e) => setVEdit(v.id, { newSizeName: e.target.value })}
                                                    size="small" sx={{ mt: 1.5, width: "100%", maxWidth: 280 }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2.5, alignItems: "flex-start" }}>
                                        <TextField
                                            label="Stock"
                                            value={edit.stock}
                                            onChange={(e) => setVEdit(v.id, { stock: e.target.value })}
                                            size="small"
                                            type="number"
                                            sx={{ width: { xs: "100%", sm: 130 } }}
                                        />
                                        <TextField
                                            label="Stock mínimo (variante)"
                                            value={edit.minStock}
                                            onChange={(e) => setVEdit(v.id, { minStock: e.target.value })}
                                            size="small"
                                            type="number"
                                            sx={{ width: { xs: "100%", sm: 170 } }}
                                            slotProps={{
                                                htmlInput: { min: 0 },
                                                formHelperText: {
                                                    sx: variantStockLow ? { color: "warning.main", fontWeight: 500 } : {},
                                                },
                                            }}
                                            helperText={
                                                variantStockLow
                                                    ? "El stock actual está en o por debajo del mínimo de esta variante."
                                                    : "Alerta por variante"
                                            }
                                        />
                                        <TextField
                                            label="SKU"
                                            value={edit.sku}
                                            onChange={(e) => setVEdit(v.id, { sku: e.target.value })}
                                            size="small"
                                            sx={{ flex: "1 1 200px", minWidth: 160 }}
                                            helperText="Identificador único"
                                        />
                                    </Box>

                                    <Divider sx={{ my: 2 }} />
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                                            Imágenes <Typography component="span" variant="caption" fontWeight={400}>(opcional)</Typography>
                                        </Typography>
                                        <Chip label={`${visible.length} en servidor`} size="small" variant="outlined" />
                                        {pendingPrev.length > 0 && (
                                            <Chip label={`+${pendingPrev.length} por subir`} size="small" color="primary" variant="outlined" />
                                        )}
                                        {toDelete > 0 && (
                                            <Chip label={`${toDelete} se eliminará al guardar`} size="small" color="error" variant="outlined" />
                                        )}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                                        La imagen principal lleva estrella; en servidor puedes cambiarla con la estrella vacía en otra foto. Fotos nuevas sin subir: la primera del recuadro será la principal al guardar (reordena con la estrella).
                                    </Typography>

                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start" }}>
                                        {!hasAnyImage ? (
                                            <VariantPrimaryImageDropSlot
                                                onOpenPicker={openVariantFilePicker}
                                                onDropFiles={(files) => appendPendingVariantImages(v.id, files)}
                                                disabled={isBusy}
                                            />
                                        ) : hasServerHero && serverHero ? (
                                            <VariantImageThumb
                                                size={VARIANT_PRIMARY_IMAGE_SIZE}
                                                src={imgUrl(serverHero.url)}
                                                alt=""
                                                onExpand={() => setImageLightbox({ src: imgUrl(serverHero.url), alt: "Imagen de variante" })}
                                                onRemove={() => markForDeletion(serverHero.id)}
                                                removeTooltip="Marcar para eliminar al guardar"
                                                isMain={serverHero.isMain}
                                                onSetAsMain={
                                                    serverHero.isMain
                                                        ? undefined
                                                        : () => {
                                                              void handleServerImageSetMain(serverHero.id);
                                                          }
                                                }
                                                setAsMainDisabled={imageThumbMainBusy}
                                            />
                                        ) : pendingPrev[0] ? (
                                            <VariantImageThumb
                                                size={VARIANT_PRIMARY_IMAGE_SIZE}
                                                src={pendingPrev[0].url}
                                                alt={pendingPrev[0].name}
                                                emphasized
                                                isMain
                                                onExpand={() => setImageLightbox({ src: pendingPrev[0].url, alt: pendingPrev[0].name })}
                                                onRemove={() => removePendingVariantImageAt(v.id, 0)}
                                            />
                                        ) : null}

                                        {serverTail.map((img) => (
                                            <VariantImageThumb
                                                key={img.id}
                                                src={imgUrl(img.url)}
                                                alt=""
                                                onExpand={() => setImageLightbox({ src: imgUrl(img.url), alt: "Imagen de variante" })}
                                                onRemove={() => markForDeletion(img.id)}
                                                removeTooltip="Marcar para eliminar al guardar"
                                                isMain={img.isMain}
                                                onSetAsMain={
                                                    img.isMain
                                                        ? undefined
                                                        : () => {
                                                              void handleServerImageSetMain(img.id);
                                                          }
                                                }
                                                setAsMainDisabled={imageThumbMainBusy}
                                            />
                                        ))}

                                        {pendingThumbs.map(({ p, idx }) => (
                                            <VariantImageThumb
                                                key={`pend-${p.name}-${idx}`}
                                                src={p.url}
                                                alt={p.name}
                                                emphasized
                                                onExpand={() => setImageLightbox({ src: p.url, alt: p.name })}
                                                onRemove={() => removePendingVariantImageAt(v.id, idx)}
                                                onSetAsMain={
                                                    idx > 0 ? () => makePendingImageMain(v.id, idx) : undefined
                                                }
                                                setAsMainDisabled={imageThumbMainBusy}
                                            />
                                        ))}

                                        {hasAnyImage ? (
                                            <VariantAddMoreImagesButton onOpenPicker={openVariantFilePicker} disabled={isBusy} />
                                        ) : null}
                                    </Box>
                                </Box>
                            );
                        })}

                        <input
                            ref={variantImagePickerRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: "none" }}
                            onChange={handleVariantImageFileChange}
                        />

                        {variantDrafts.length > 0 && (
                            <>
                                <Divider sx={{ my: 3 }} />
                                <SectionTitle sx={{ mb: 0.5 }}>Nuevas variantes (borrador)</SectionTitle>
                                <Typography variant="body2" color="text.secondary" sx={{ display: "block", mb: 2, maxWidth: 560 }}>
                                    Se crean en el servidor al pulsar «Guardar cambios». Las filas totalmente vacías se omiten.
                                </Typography>
                            </>
                        )}

                        {variantDrafts.map((vd, vi) => {
                            const ep = `nd${vi}`;
                            const draftStockLow = isVariantStockAtOrBelowMin(vd.stock, vd.minStock);
                            const draftFileId = `draft-file-${vd.rowId}`;
                            const draftFirst = vd.imagePreviews[0];
                            const draftRest = vd.imagePreviews.slice(1);
                            return (
                                <Box
                                    key={vd.rowId}
                                    sx={{
                                        mb: 2.5,
                                        p: { xs: 1.5, sm: 2.5 },
                                        border: "2px dashed",
                                        borderColor: "primary.main",
                                        borderRadius: 2,
                                        bgcolor: variantCardBg,
                                    }}
                                >
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            Nueva variante {vi + 1}
                                        </Typography>
                                        <Tooltip title="Quitar esta fila">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                aria-label="Quitar borrador"
                                                onClick={() => removeVariantDraftRow(vd.rowId)}
                                                disabled={isBusy}
                                            >
                                                <DeleteOutlineRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
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
                                                                onClick={() => setDraft(vd.rowId, { selectedColor: c, showNewColor: false })}
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
                                                            onClick={() => setDraft(vd.rowId, { showNewColor: !vd.showNewColor, selectedColor: null })}
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
                                                        onChange={(e) => setDraft(vd.rowId, { newColorName: e.target.value })}
                                                        size="small" sx={{ flex: 1, width: "100%" }}
                                                        error={!!errors[`${ep}_newColorName`]} helperText={errors[`${ep}_newColorName`]}
                                                    />
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <Box
                                                            component="input"
                                                            type="color"
                                                            value={vd.newColorHex}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(vd.rowId, { newColorHex: e.target.value })}
                                                            sx={{
                                                                width: 38, height: 38, p: "2px",
                                                                border: "1px solid", borderColor: "divider",
                                                                borderRadius: 1, cursor: "pointer",
                                                                bgcolor: "transparent",
                                                            }}
                                                        />
                                                        <TextField
                                                            label="Hex" value={vd.newColorHex}
                                                            onChange={(e) => setDraft(vd.rowId, { newColorHex: e.target.value })}
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
                                                            onClick={() => setDraft(vd.rowId, { selectedSize: s, showNewSize: false })}
                                                            color={vd.selectedSize?.id === s.id ? "primary" : "default"}
                                                            variant={vd.selectedSize?.id === s.id ? "filled" : "outlined"}
                                                            size="small" sx={{ cursor: "pointer" }}
                                                        />
                                                    ))}
                                                    <Chip
                                                        icon={<AddRoundedIcon />}
                                                        label="Nueva talla"
                                                        onClick={() => setDraft(vd.rowId, { showNewSize: !vd.showNewSize, selectedSize: null })}
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
                                                    onChange={(e) => setDraft(vd.rowId, { newSizeName: e.target.value })}
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
                                            onChange={(e) => setDraft(vd.rowId, { stock: e.target.value })}
                                            size="small"
                                            type="number"
                                            sx={{ width: { xs: "100%", sm: 140 } }}
                                            error={!!errors[`${ep}_stock`]}
                                            helperText={errors[`${ep}_stock`]}
                                        />
                                        <TextField
                                            label="Stock mínimo (variante)"
                                            value={vd.minStock}
                                            onChange={(e) => setDraft(vd.rowId, { minStock: e.target.value })}
                                            size="small"
                                            type="number"
                                            sx={{ width: { xs: "100%", sm: 160 } }}
                                            slotProps={{
                                                htmlInput: { min: 0 },
                                                formHelperText: {
                                                    sx: draftStockLow ? { color: "warning.main", fontWeight: 500 } : {},
                                                },
                                            }}
                                            helperText={
                                                draftStockLow
                                                    ? "El stock actual está en o por debajo del mínimo de esta variante."
                                                    : "Alerta por variante"
                                            }
                                        />
                                        <TextField
                                            label="SKU *"
                                            value={vd.sku}
                                            onChange={(e) => setDraft(vd.rowId, { sku: e.target.value })}
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
                                        La primera foto será la principal al guardar. Usa la estrella vacía en otra miniatura para ponerla primera, o «Agregar imágenes» para más.
                                    </Typography>
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start" }}>
                                        {!draftFirst ? (
                                            <VariantPrimaryImageDropSlot
                                                inputId={draftFileId}
                                                onDropFiles={(files) => appendDraftImages(vd.rowId, files)}
                                                disabled={isBusy}
                                            />
                                        ) : (
                                            <VariantImageThumb
                                                size={VARIANT_PRIMARY_IMAGE_SIZE}
                                                src={draftFirst.url}
                                                alt={draftFirst.name}
                                                isMain
                                                onExpand={() => setImageLightbox({ src: draftFirst.url, alt: draftFirst.name })}
                                                onRemove={() => removeDraftImageAt(vd.rowId, 0)}
                                            />
                                        )}
                                        {draftRest.map((p, i) => (
                                            <VariantImageThumb
                                                key={`${p.name}-${i + 1}`}
                                                src={p.url}
                                                alt={p.name}
                                                onExpand={() => setImageLightbox({ src: p.url, alt: p.name })}
                                                onRemove={() => removeDraftImageAt(vd.rowId, i + 1)}
                                                onSetAsMain={() => makeDraftImageMain(vd.rowId, i + 1)}
                                                setAsMainDisabled={isBusy}
                                            />
                                        ))}
                                        {draftFirst ? (
                                            <VariantAddMoreImagesButton inputId={draftFileId} disabled={isBusy} />
                                        ) : null}
                                    </Box>
                                    <input
                                        id={draftFileId}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        hidden
                                        onChange={handleDraftImageFileChange}
                                    />
                                </Box>
                            );
                        })}
                    </>
                )}
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
                <Button variant="outlined" onClick={handleClose} disabled={isBusy}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    loading={submitting}
                    disabled={isBusy}
                    startIcon={<SaveRoundedIcon />}
                >
                    Guardar cambios
                </Button>
            </DialogActions>
        </Dialog>

        <Dialog
            open={variantIdPendingDelete !== null}
            onClose={() => { if (!deletingVariant) setVariantIdPendingDelete(null); }}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>Eliminar variante</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    La variante dejará de mostrarse en la tienda (se desactiva). Puedes crear otra variante después con «Agregar variante».
                </Typography>
                {activeVariants.length === 1 && variantIdPendingDelete != null && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        Es la única variante activa de este producto.
                    </Alert>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 2 }}>
                <Button onClick={() => setVariantIdPendingDelete(null)} disabled={deletingVariant}>
                    Cancelar
                </Button>
                <Button
                    color="error"
                    variant="contained"
                    onClick={handleConfirmDeleteVariant}
                    disabled={deletingVariant}
                    startIcon={deletingVariant ? <CircularProgress size={18} color="inherit" /> : undefined}
                >
                    {deletingVariant ? "Eliminando…" : "Eliminar"}
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
