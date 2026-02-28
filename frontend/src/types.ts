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
    user?: { id: number; username: string };
}

export interface AuthResponse {
    token: string;
    user: { id: number; username: string };
}
