export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface CashSessionReport {
    id: number;
    cashRegisterId: number | null;
    cashRegisterName: string;
    initialAmount: number;
    closingAmount: number | null;
    systemBalance: number | null;
    difference: number | null;
    openedAt: string;
    closedAt: string | null;
    isActive: boolean;
}

export interface ProductReportRow {
    id: number;
    name: string;
    categoryName: string;
    salePrice: number;
    variantCount: number;
    totalStock: number;
    isActive: boolean;
}

export interface CashSessionFilters {
    cashRegisterId?: number | "";
    startDate?: string;
    endDate?: string;
    status?: string;
}

export interface ProductFilters {
    categoryId?: number | "";
    status?: string;
    stockFilter?: string;
}
