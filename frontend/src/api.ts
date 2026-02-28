import type {
    GenerateRequest,
    GenerateResponse,
    CheckResponse,
    Tag,
    VaultEntry,
    VaultEntryWithPassword,
    AuthStatus,
    AuthResponse,
    Group,
    GroupInvitation,
    GroupPassword,
    GroupPasswordWithPassword,
} from './types';

const BASE = 'https://sekure-woad.vercel.app/api';
const TOKEN_KEY = 'sekure_token';

let authToken: string | null = localStorage.getItem(TOKEN_KEY);

function setToken(token: string) {
    authToken = token;
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    authToken = null;
    localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    const res = await fetch(`${BASE}${url}`, {
        headers,
        ...options,
    });
    if (!res.ok) {
        if (res.status === 401) {
            clearToken();
        }
        const err = await res.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(err.detail || `Error ${res.status}`);
    }
    return res.json();
}

// Auth
export const getAuthStatus = () => request<AuthStatus>('/auth/status');

export const register = async (username: string, master_password: string) => {
    const res = await request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, master_password }),
    });
    setToken(res.token);
    return res;
};

export const login = async (username: string, master_password: string) => {
    const res = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, master_password }),
    });
    setToken(res.token);
    return res;
};

export const logout = async () => {
    await request<{ message: string }>('/auth/logout', { method: 'POST' });
    clearToken();
};

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

// Groups
export const listGroups = () => request<Group[]>('/groups');
export const createGroup = (name: string) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify({ name }) });
export const getGroup = (id: number) => request<Group>(`/groups/${id}`);
export const deleteGroup = (id: number) =>
    request<{ message: string }>(`/groups/${id}`, { method: 'DELETE' });

export const inviteToGroup = (groupId: number, username: string) =>
    request<{ message: string }>(`/groups/${groupId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ username }),
    });

export const kickFromGroup = (groupId: number, userId: number) =>
    request<{ message: string }>(`/groups/${groupId}/kick/${userId}`, { method: 'POST' });

export const getPendingInvitations = () =>
    request<GroupInvitation[]>('/groups/invitations/pending');

export const acceptInvitation = (invitationId: number) =>
    request<{ message: string }>(`/groups/invitations/${invitationId}/accept`, { method: 'POST' });

export const ignoreInvitation = (invitationId: number) =>
    request<{ message: string }>(`/groups/invitations/${invitationId}/ignore`, { method: 'POST' });

// Group Vault
export const listGroupVault = (groupId: number) =>
    request<GroupPassword[]>(`/groups/${groupId}/vault`);

export const createGroupVaultEntry = (groupId: number, data: {
    title: string; username?: string; url?: string; password: string; notes?: string;
}) =>
    request<GroupPassword>(`/groups/${groupId}/vault`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const getGroupVaultEntry = (groupId: number, entryId: number) =>
    request<GroupPasswordWithPassword>(`/groups/${groupId}/vault/${entryId}`);

export const deleteGroupVaultEntry = (groupId: number, entryId: number) =>
    request<{ message: string }>(`/groups/${groupId}/vault/${entryId}`, { method: 'DELETE' });
