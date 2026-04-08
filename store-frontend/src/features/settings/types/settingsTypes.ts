export interface UpdateProfileForm {
    name: string;
    email: string;
}

export interface ChangePasswordForm {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface StoreConfig {
    storeName: string;
    storeRuc: string | null;
    storeAddress: string | null;
    logoUrl: string | null;
    updatedAt: string;
}

export interface StoreConfigUpdate {
    storeName: string;
    storeRuc?: string;
    storeAddress?: string;
}
