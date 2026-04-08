import dayjs from "dayjs";
import { Product } from "@/features/products/types/productsTypes";

/**
 * Precio unitario efectivo (misma lógica que el backend: descuento si está vigente).
 */
export function effectiveSalePrice(product: Product): number {
    const base = product.salePrice;
    const pct  = product.discountPercentage;
    const start = product.discountStart;
    const end   = product.discountEnd;
    if (pct == null || start == null || end == null) return round2(base);
    const now = dayjs();
    if (now.isBefore(dayjs(start)) || now.isAfter(dayjs(end))) return round2(base);
    return round2(base * (1 - Number(pct) / 100));
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
