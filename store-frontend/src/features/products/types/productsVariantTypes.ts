import { ProductsVariantImage } from "./productsVariantImageTypes";

export interface ProductsVariant {
    id: number;
    productId: number;
    productName: string;
    colorId?: number;
    colorName?: string;
    colorHexCode?: string;
    sizeId?: number;
    sizeName?: string;
    stock: number;
    minStock: number;
    sku: string;
    isActive: boolean;
    images: ProductsVariantImage[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductsVariant {
    productId: number;
    colorId?: number;
    sizeId?: number;
    stock: number;
    minStock?: number;
    sku: string;
}

export interface UpdateProductsVariant {
    colorId?: number;
    sizeId?: number;
    stock: number;
    minStock?: number;
    sku: string;
}