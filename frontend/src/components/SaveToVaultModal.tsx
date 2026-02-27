import { useState, useEffect } from 'react';
import { createVaultEntry, listTags } from '../api';
import type { Tag } from '../types';
import toast from 'react-hot-toast';
import {
    X, Save, Eye, EyeOff, Star,
} from 'lucide-react';

interface SaveToVaultModalProps {
    password?: string;
    onClose: () => void;
}

export default function SaveToVaultModal({ password: initialPassword, onClose }: SaveToVaultModalProps) {
    const [title, setTitle] = useState('');
    const [username, setUsername] = useState('');
    const [url, setUrl] = useState('');
    const [password, setPassword] = useState(initialPassword || '');
    const [notes, setNotes] = useState('');
    const [isFavorite, setIsFavorite] = useState(false);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [showPassword, setShowPassword] = useState(!!initialPassword);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        listTags().then(setTags).catch(() => { });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !password) {
            toast.error('Título y contraseña son obligatorios');
            return;
        }

        setLoading(true);
        try {
            await createVaultEntry({
                title,
                username,
                url,
                password,
                notes,
                is_favorite: isFavorite,
                tag_ids: selectedTags,
            });
            toast.success('Contraseña guardada en la bóveda');
            onClose();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleTag = (id: number) => {
        setSelectedTags((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-lg card animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Guardar en Bóveda</h3>
                    <button onClick={onClose} className="btn-ghost p-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-300 block mb-1">Título *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="ej: Gmail, Netflix, Banco..."
                            className="input-field"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-300 block mb-1">Usuario / Email</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="ej: usuario@email.com"
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-300 block mb-1">URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="ej: https://www.ejemplo.com"
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-300 block mb-1">Contraseña *</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Introduce la contraseña"
                                className="input-field pr-12 font-mono-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-gray-300 block mb-1">Notas</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notas adicionales..."
                            className="input-field resize-none h-20"
                        />
                    </div>

                    {/* Favorite */}
                    <button
                        type="button"
                        onClick={() => setIsFavorite(!isFavorite)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isFavorite
                                ? 'bg-yellow-600/15 text-yellow-400 border border-yellow-600/30'
                                : 'bg-gray-800 text-gray-400 border border-gray-700'
                            }`}
                    >
                        <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400' : ''}`} />
                        {isFavorite ? 'Favorito' : 'Marcar como favorito'}
                    </button>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div>
                            <label className="text-sm text-gray-300 block mb-2">Etiquetas</label>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleTag(tag.id)}
                                        className={`badge border transition-colors ${selectedTags.includes(tag.id)
                                                ? 'border-opacity-50'
                                                : 'border-gray-700 text-gray-400'
                                            }`}
                                        style={{
                                            backgroundColor: selectedTags.includes(tag.id) ? `${tag.color}20` : undefined,
                                            borderColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                                            color: selectedTags.includes(tag.id) ? tag.color : undefined,
                                        }}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title || !password}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
