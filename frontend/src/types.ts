export interface GenerateRequest {
    length: number;
    method: 'random' | 'passphrase' | 'pin';
    include_uppercase: boolean;
    include_lowercase: boolean;
    include_digits: boolean;
    include_symbols: boolean;
    num_words: number;
    separator: string;
}

export interface GenerateResponse {
    password: string;
    entropy: number;
    strength: string;
    crack_time: string;
}

export interface CheckResponse {
    entropy: number;
    strength: string;
    strength_score: number;
    crack_time: string;
    is_breached: boolean;
    breach_count: number;
    feedback: string[];
    char_distribution: Record<string, number>;
    entropy_breakdown: EntropyBreakdown[];
}

export interface EntropyBreakdown {
    position: number;
    char: string;
    type: string;
    bits: number;
    cumulative: number;
}

export interface Tag {
    id: number;
    name: string;
    color: string;
}

export interface VaultEntry {
    id: number;
    title: string;
    username: string;
    url: string;
    notes: string;
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
    tags: Tag[];
}

export interface VaultEntryWithPassword extends VaultEntry {
    password: string;
}

export interface AuthStatus {
    authenticated: boolean;
    user?: { id: number; username: string; is_kids_account?: boolean };
}

export interface AuthResponse {
    token: string;
    user: { id: number; username: string; is_kids_account?: boolean };
}

// --- Groups ---

export interface GroupMember {
    id: number;
    user_id: number;
    username: string;
    joined_at: string;
}

export interface Group {
    id: number;
    name: string;
    owner_id: number;
    owner_username: string;
    created_at: string;
    members: GroupMember[];
}

export interface GroupInvitation {
    id: number;
    group_id: number;
    group_name: string;
    inviter_username: string;
    status: string;
    created_at: string;
}

export interface GroupPassword {
    id: number;
    group_id: number;
    title: string;
    username: string;
    url: string;
    notes: string;
    added_by: number;
    added_by_username: string;
    created_at: string;
    updated_at: string;
}

export interface GroupPasswordWithPassword extends GroupPassword {
    password: string;
}

// --- Sekure Kids ---

export interface KidsAccount {
    id: number;
    username: string;
    created_at: string;
}
