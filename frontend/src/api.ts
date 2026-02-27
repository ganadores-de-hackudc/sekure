import type {
    GenerateRequest,
    GenerateResponse,
    CheckResponse,
    Tag,
    VaultEntry,
    VaultEntryWithPassword,
    AuthStatus,
} from './types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(err.detail || `Error ${res.status}`);
    }
    return res.json();
}

// Auth
export const getAuthStatus = () => request<AuthStatus>('/auth/status');
export const setupMaster = (master_password: string) =>
    request<{ message: string }>('/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ master_password }),
    });
export const unlockVault = (master_password: string) =>
    request<{ message: string }>('/auth/unlock', {
        method: 'POST',
        body: JSON.stringify({ master_password }),
    });
export const lockVault = () =>
    request<{ message: string }>('/auth/lock', { method: 'POST' });

// Password generation
export const generatePassword = (data: GenerateRequest) =>
    request<GenerateResponse>('/passwords/generate', {
        method: 'POST',
        body: JSON.stringify(data),
    });

// Password checking
export const checkPassword = (password: string) =>
    request<CheckResponse>('/passwords/check', {
        method: 'POST',
        body: JSON.stringify({ password }),
    });

// Vault
export const listVault = (params?: {
    search?: string;
    tag?: string;
    favorites_only?: boolean;
}) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.tag) sp.set('tag', params.tag);
    if (params?.favorites_only) sp.set('favorites_only', 'true');
    const qs = sp.toString();
    return request<VaultEntry[]>(`/vault${qs ? `?${qs}` : ''}`);
};

export const getVaultEntry = (id: number) =>
    request<VaultEntryWithPassword>(`/vault/${id}`);

export const createVaultEntry = (data: {
    title: string;
    username?: string;
    url?: string;
    password: string;
    notes?: string;
    is_favorite?: boolean;
    tag_ids?: number[];
}) =>
    request<VaultEntry>('/vault', {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const updateVaultEntry = (
    id: number,
    data: {
        title?: string;
        username?: string;
        url?: string;
        password?: string;
        notes?: string;
        is_favorite?: boolean;
        tag_ids?: number[];
    },
) =>
    request<VaultEntry>(`/vault/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteVaultEntry = (id: number) =>
    request<{ message: string }>(`/vault/${id}`, { method: 'DELETE' });

export const toggleFavorite = (id: number) =>
    request<{ is_favorite: boolean }>(`/vault/${id}/favorite`, { method: 'PUT' });

// Tags
export const listTags = () => request<Tag[]>('/tags');
export const createTag = (name: string, color?: string) =>
    request<Tag>('/tags', {
        method: 'POST',
        body: JSON.stringify({ name, color }),
    });
export const deleteTag = (id: number) =>
    request<{ message: string }>(`/tags/${id}`, { method: 'DELETE' });
