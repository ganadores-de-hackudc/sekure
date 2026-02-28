import type {
    GenerateRequest,
    GenerateResponse,
    CheckResponse,
    Tag,
    VaultEntry,
    VaultEntryEncrypted,
    VaultEntryWithPassword,
    AuthStatus,
    AuthResponse,
    Group,
    GroupInvitation,
    GroupPassword,
    GroupPasswordEncrypted,
    GroupPasswordWithPassword,
    KidsAccount,
} from './types';
import {
    deriveKey, encryptPassword, decryptPassword,
    exportKey, importKey, deriveKidsKey,
} from './crypto';

const BASE = 'https://sekure-woad.vercel.app/api';
const TOKEN_KEY = 'sekure_token';
const SALT_KEY = 'sekure_salt';
const EKEY_KEY = 'sekure_ekey';    // exported encryption key (base64)

let authToken: string | null = localStorage.getItem(TOKEN_KEY);
let encryptionKey: CryptoKey | null = null;

// Restore key from sessionStorage on page reload
(async () => {
    const stored = sessionStorage.getItem(EKEY_KEY);
    if (stored) {
        try { encryptionKey = await importKey(stored); } catch { /* ignore */ }
    }
})();

function setToken(token: string) {
    authToken = token;
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    authToken = null;
    encryptionKey = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SALT_KEY);
    sessionStorage.removeItem(EKEY_KEY);
}

/** Store the derived encryption key (call after login/register) */
async function setEncryptionKey(masterPassword: string, salt: string) {
    const key = await deriveKey(masterPassword, salt);
    encryptionKey = key;
    // Persist in sessionStorage so it survives page reloads (cleared on tab close)
    const exported = await exportKey(key);
    sessionStorage.setItem(EKEY_KEY, exported);
    localStorage.setItem(SALT_KEY, salt);
}

/** Get the current encryption key (throws if not available) */
function getKey(): CryptoKey {
    if (!encryptionKey) throw new Error('Encryption key not available. Please log in again.');
    return encryptionKey;
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
    await setEncryptionKey(master_password, res.salt);
    return res;
};

export const recoverAccount = async (username: string, recovery_code: string, new_master_password: string) => {
    const res = await request<AuthResponse & { message: string }>('/auth/recover', {
        method: 'POST',
        body: JSON.stringify({ username, recovery_code, new_master_password }),
    });
    setToken(res.token);
    await setEncryptionKey(new_master_password, res.salt);
    return res;
};

export const login = async (username: string, master_password: string) => {
    const res = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, master_password }),
    });
    setToken(res.token);
    await setEncryptionKey(master_password, res.salt);
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
    tags?: string[];
    favorites_only?: boolean;
}) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.tags && params.tags.length > 0) sp.set('tag', params.tags.join(','));
    if (params?.favorites_only) sp.set('favorites_only', 'true');
    const qs = sp.toString();
    return request<VaultEntry[]>(`/vault${qs ? `?${qs}` : ''}`);
};

export const getVaultEntry = async (id: number): Promise<VaultEntryWithPassword> => {
    const entry = await request<VaultEntryEncrypted>(`/vault/${id}`);
    const key = getKey();
    const password = await decryptPassword(entry.encrypted_password, entry.iv, key);
    return { ...entry, password };
};

export const createVaultEntry = async (data: {
    title: string;
    username?: string;
    url?: string;
    password: string;
    notes?: string;
    is_favorite?: boolean;
    tag_ids?: number[];
}) => {
    const key = getKey();
    const { encrypted_password, iv } = await encryptPassword(data.password, key);
    return request<VaultEntry>('/vault', {
        method: 'POST',
        body: JSON.stringify({
            title: data.title,
            username: data.username,
            url: data.url,
            encrypted_password,
            iv,
            notes: data.notes,
            is_favorite: data.is_favorite,
            tag_ids: data.tag_ids,
        }),
    });
};

export const updateVaultEntry = async (
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
) => {
    const body: Record<string, unknown> = { ...data };
    // If password is being updated, encrypt it client-side
    if (data.password != null) {
        const key = getKey();
        const { encrypted_password, iv } = await encryptPassword(data.password, key);
        delete body.password;
        body.encrypted_password = encrypted_password;
        body.iv = iv;
    }
    return request<VaultEntry>(`/vault/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
};

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

export const leaveGroup = (groupId: number) =>
    request<{ message: string }>(`/groups/${groupId}/leave`, { method: 'POST' });

export const listGroupInvitations = (groupId: number) =>
    request<{ id: number; invitee_id: number; invitee_username: string; status: string; created_at: string }[]>(`/groups/${groupId}/invitations`);

export const cancelInvitation = (groupId: number, invitationId: number) =>
    request<{ message: string }>(`/groups/${groupId}/invitations/${invitationId}`, { method: 'DELETE' });

export const getPendingInvitations = () =>
    request<GroupInvitation[]>('/groups/invitations/pending');

export const acceptInvitation = (invitationId: number) =>
    request<{ message: string }>(`/groups/invitations/${invitationId}/accept`, { method: 'POST' });

export const ignoreInvitation = (invitationId: number) =>
    request<{ message: string }>(`/groups/invitations/${invitationId}/ignore`, { method: 'POST' });

// Group Vault
// Cache group keys so we only fetch once per session
const groupKeyCache: Record<number, CryptoKey> = {};

async function getGroupKey(groupId: number): Promise<CryptoKey> {
    if (groupKeyCache[groupId]) return groupKeyCache[groupId];
    const { encryption_key } = await request<{ encryption_key: string }>(`/groups/${groupId}/key`);
    const key = await importKey(encryption_key);
    groupKeyCache[groupId] = key;
    return key;
}

export const listGroupVault = (groupId: number) =>
    request<GroupPassword[]>(`/groups/${groupId}/vault`);

export const createGroupVaultEntry = async (groupId: number, data: {
    title: string; username?: string; url?: string; password: string; notes?: string;
}) => {
    const key = await getGroupKey(groupId);
    const { encrypted_password, iv } = await encryptPassword(data.password, key);
    return request<GroupPassword>(`/groups/${groupId}/vault`, {
        method: 'POST',
        body: JSON.stringify({
            title: data.title,
            username: data.username,
            url: data.url,
            encrypted_password,
            iv,
            notes: data.notes,
        }),
    });
};

export const getGroupVaultEntry = async (groupId: number, entryId: number): Promise<GroupPasswordWithPassword> => {
    const entry = await request<GroupPasswordEncrypted>(`/groups/${groupId}/vault/${entryId}`);
    const key = await getGroupKey(groupId);
    const password = await decryptPassword(entry.encrypted_password, entry.iv, key);
    return { ...entry, password };
};

export const deleteGroupVaultEntry = (groupId: number, entryId: number) =>
    request<{ message: string }>(`/groups/${groupId}/vault/${entryId}`, { method: 'DELETE' });

export const importVaultEntryToGroup = async (groupId: number, entryId: number) => {
    // Client-side re-encryption: decrypt with user key, re-encrypt with group key
    const userEntry = await request<VaultEntryEncrypted>(`/vault/${entryId}`);
    const userKey = getKey();
    const plaintext = await decryptPassword(userEntry.encrypted_password, userEntry.iv, userKey);
    const groupKey = await getGroupKey(groupId);
    const { encrypted_password, iv } = await encryptPassword(plaintext, groupKey);

    return request<GroupPassword>(`/groups/${groupId}/vault`, {
        method: 'POST',
        body: JSON.stringify({
            title: userEntry.title,
            username: userEntry.username,
            url: userEntry.url,
            encrypted_password,
            iv,
            notes: userEntry.notes,
        }),
    });
};

export const updateGroupVaultEntry = async (groupId: number, entryId: number, data: {
    title?: string; username?: string; url?: string; password?: string; notes?: string;
}) => {
    const body: Record<string, unknown> = { ...data };
    if (data.password != null) {
        const key = await getGroupKey(groupId);
        const { encrypted_password, iv } = await encryptPassword(data.password, key);
        delete body.password;
        body.encrypted_password = encrypted_password;
        body.iv = iv;
    }
    return request<GroupPassword>(`/groups/${groupId}/vault/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
};

// Sekure Kids
export const listKidsAccounts = () => request<KidsAccount[]>('/kids/accounts');
export const createKidsAccount = (username: string, password: string) =>
    request<KidsAccount>('/kids/accounts', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
export const updateKidsAccount = (id: number, data: { username?: string; password?: string }) =>
    request<KidsAccount>(`/kids/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
export const deleteKidsAccount = (id: number) =>
    request<{ message: string }>(`/kids/accounts/${id}`, { method: 'DELETE' });

export const listKidsVault = async (kidId: number) => {
    const res = await request<{
        entries: VaultEntry[];
        kid_salt: string;
        kid_id: number;
        parent_id: number;
    }>(`/kids/accounts/${kidId}/vault`);
    return res.entries;
};

export const createKidsVaultEntry = async (kidId: number, data: {
    title: string; username?: string; url?: string; password: string; notes?: string;
}) => {
    // First fetch kid info to derive key
    const res = await request<{
        entries: VaultEntry[];
        kid_salt: string;
        kid_id: number;
        parent_id: number;
    }>(`/kids/accounts/${kidId}/vault`);
    const key = await deriveKidsKey(res.kid_id, res.parent_id, res.kid_salt);
    const { encrypted_password, iv } = await encryptPassword(data.password, key);
    return request<VaultEntry>(`/kids/accounts/${kidId}/vault`, {
        method: 'POST',
        body: JSON.stringify({
            title: data.title,
            username: data.username,
            url: data.url,
            encrypted_password,
            iv,
            notes: data.notes,
        }),
    });
};

export const getKidsVaultEntry = async (kidId: number, entryId: number): Promise<VaultEntryWithPassword> => {
    const entry = await request<VaultEntryEncrypted & {
        kid_salt: string;
        kid_id: number;
        parent_id: number;
    }>(`/kids/accounts/${kidId}/vault/${entryId}`);
    const key = await deriveKidsKey(entry.kid_id, entry.parent_id, entry.kid_salt);
    const password = await decryptPassword(entry.encrypted_password, entry.iv, key);
    return { ...entry, password };
};

export const deleteKidsVaultEntry = (kidId: number, entryId: number) =>
    request<{ message: string }>(`/kids/accounts/${kidId}/vault/${entryId}`, { method: 'DELETE' });

// ==================== PROFILE ====================
export const changeUsername = (newUsername: string, currentPassword: string) =>
    request<{ message: string; username: string }>('/profile/username', {
        method: 'PUT',
        body: JSON.stringify({ new_username: newUsername, current_password: currentPassword }),
    });

export const changePassword = async (currentPassword: string, newPassword: string) => {
    // 1. Fetch all vault entries (encrypted)
    const entries = await request<VaultEntry[]>('/vault');
    const oldKey = getKey();

    // 2. Re-encrypt each entry with new key (need new salt first)
    // We'll compute the new salt client-side and send re-encrypted data
    const reEncrypted: { id: number; encrypted_password: string; iv: string }[] = [];
    for (const entry of entries) {
        try {
            const full = await request<VaultEntryEncrypted>(`/vault/${entry.id}`);
            const plaintext = await decryptPassword(full.encrypted_password, full.iv, oldKey);
            // Store temporarily — we'll re-encrypt after getting new salt from server
            reEncrypted.push({ id: entry.id, encrypted_password: plaintext, iv: '' });
        } catch {
            // Skip entries that fail
        }
    }

    // 3. Call server to change password (server returns new salt)
    // First pass: send without re-encrypted entries to get new salt
    const res = await request<{ message: string; token: string; salt: string }>('/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });

    // 4. Derive new key and re-encrypt
    setToken(res.token);
    await setEncryptionKey(newPassword, res.salt);
    const newKey = getKey();

    for (const entry of reEncrypted) {
        try {
            const { encrypted_password, iv } = await encryptPassword(entry.encrypted_password, newKey);
            // Update each entry with new encryption
            await request(`/vault/${entry.id}`, {
                method: 'PUT',
                body: JSON.stringify({ encrypted_password, iv }),
            });
        } catch {
            // Skip entries that fail
        }
    }

    return res;
};

export const deleteAccount = (currentPassword: string) =>
    request<{ message: string }>('/profile', {
        method: 'DELETE',
        body: JSON.stringify({ current_password: currentPassword }),
    });

// ==================== SHARE LINKS ====================
export const createShareLink = (data: {
    encrypted_data: string;
    iv: string;
    expires_in: string;
    access_mode: string;
    allowed_usernames: string[];
}) =>
    request<{ id: string }>('/share', {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const getShareLink = (shareId: string) =>
    request<{
        encrypted_data: string;
        iv: string;
        creator_username: string;
        expires_at: string;
    }>(`/share/${shareId}`);

