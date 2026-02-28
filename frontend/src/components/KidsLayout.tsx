import { useState } from 'react';
import { logout } from '../api';
import { useTheme } from '../ThemeContext';
import { useLanguage, LANGUAGES } from '../i18n';
import toast from 'react-hot-toast';
import { LogOut, Moon, Sun, Globe, ChevronDown } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface KidsLayoutProps {
    children: React.ReactNode;
    username: string;
    onLogout: () => void;
}

export default function KidsLayout({ children, username, onLogout }: KidsLayoutProps) {
    const { theme, toggleTheme } = useTheme();
    const { t, lang, setLang } = useLanguage();
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);
    const currentLang = LANGUAGES.find(l => l.code === lang)!;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success(t('nav.logout_success'));
            onLogout();
        } catch {
            toast.error(t('nav.logout_error'));
            onLogout();
        }
    };

    return (
        <div className="min-h-screen" style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1a1025 0%, #0f172a 30%, #0c1a2e 60%, #1a1025 100%)' : 'linear-gradient(135deg, #fce4ec 0%, #e8eaf6 30%, #e0f7fa 60%, #fff9c4 100%)' }}>
            {/* Top bar */}
            <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-pink-200 dark:border-purple-800">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <img src="/sekure-kids-logo.svg" alt="Sekure Kids" className="h-10" />
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400 mr-2">👋 {username}</span>

                        {/* Language */}
                        <div ref={langRef} className="relative">
                            <button onClick={() => setLangOpen(!langOpen)} className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                <Globe className="w-4 h-4" />
                                <span className="text-xs">{currentLang.flag}</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            {langOpen && (
                                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]">
                                    {LANGUAGES.map(l => (
                                        <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }}
                                            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${l.code === lang ? 'bg-purple-50 dark:bg-purple-800/20 text-purple-600 dark:text-purple-400 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                            <span>{l.flag}</span>
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Theme */}
                        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors text-gray-600 dark:text-gray-300">
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* Logout */}
                        <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/30 transition-colors text-red-500">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
