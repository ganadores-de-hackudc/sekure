import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { logout, getPendingInvitations } from '../api';
import { useTheme } from '../ThemeContext';
import { useLanguage, LANGUAGES } from '../i18n';
import toast from 'react-hot-toast';
import {
    KeyRound, ShieldCheck, Archive, Users,
    LogOut, Menu, X, User, Moon, Sun, Globe, ChevronDown,
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    username: string;
    onLogout: () => void;
}

export default function Layout({ children, username, onLogout }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const langRef = useRef<HTMLDivElement>(null);
    const { theme, toggleTheme } = useTheme();
    const { lang, setLang, t } = useLanguage();
    const location = useLocation();

    const navItems = [
        { to: '/vault', icon: Archive, label: t('nav.vault') },
        { to: '/generator', icon: KeyRound, label: t('nav.generator') },
        { to: '/checker', icon: ShieldCheck, label: t('nav.checker') },
        { to: '/groups', icon: Users, label: t('nav.groups'), badge: pendingCount },
    ];

    // Fetch pending invitation count
    useEffect(() => {
        const fetchPending = async () => {
            try {
                const inv = await getPendingInvitations();
                setPendingCount(inv.length);
            } catch { /* ignore */ }
        };
        fetchPending();
        const interval = setInterval(fetchPending, 15000); // poll every 15s
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setLangOpen(false);
            }
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

    const currentLang = LANGUAGES.find(l => l.code === lang)!;

    return (
        <div className="min-h-screen flex bg-beige-50 dark:bg-gray-950">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-10">
                    <img src="/sekure-longlogo.svg" alt="Sekure" className="h-10" />
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map(({ to, icon: Icon, label, badge }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                isActive ? 'sidebar-link-active' : 'sidebar-link'
                            }
                        >
                            <span className="relative">
                                <Icon className="w-5 h-5" />
                                {badge != null && badge > 0 && (
                                    <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {badge}
                                    </span>
                                )}
                            </span>
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Sekure KIDS */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-3">
                    <NavLink
                        to="/kids"
                        className={({ isActive }) =>
                            isActive ? 'sidebar-link-active' : 'sidebar-link'
                        }
                    >
                        <img src="/sekure-kids-logo.svg" alt="sekure KIDS" className="h-5" />
                    </NavLink>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-3">
                    <div className="flex items-center gap-2 px-4 py-2 mb-2">
                        <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{username}</span>
                    </div>
                    <button onClick={handleLogout} className="sidebar-link text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-600/10">
                        <LogOut className="w-5 h-5" />
                        {t('nav.logout')}
                    </button>
                </div>
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/40 dark:bg-black/60" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 z-10 flex flex-col animate-fade-in shadow-xl">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <img src="/sekure-longlogo.svg" alt="Sekure" className="h-10" />
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="btn-ghost">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <nav className="flex-1 space-y-2">
                            {navItems.map(({ to, icon: Icon, label, badge }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        isActive ? 'sidebar-link-active' : 'sidebar-link'
                                    }
                                >
                                    <span className="relative">
                                        <Icon className="w-5 h-5" />
                                        {badge != null && badge > 0 && (
                                            <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                {badge}
                                            </span>
                                        )}
                                    </span>
                                    {label}
                                </NavLink>
                            ))}
                        </nav>

                        {/* Sekure KIDS */}
                        <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-3">
                            <NavLink
                                to="/kids"
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    isActive ? 'sidebar-link-active' : 'sidebar-link'
                                }
                            >
                                <img src="/sekure-kids-logo.svg" alt="sekure KIDS" className="h-5" />
                            </NavLink>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-3">
                            <div className="flex items-center gap-2 px-4 py-2 mb-2">
                                <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{username}</span>
                            </div>
                            <button onClick={handleLogout} className="sidebar-link text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-600/10">
                                <LogOut className="w-5 h-5" />
                                {t('nav.logout')}
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* Main content */}
            <main className="flex-1 flex flex-col min-h-screen">
                {/* Top bar with language selector + theme toggle */}
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="btn-ghost lg:hidden">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2 lg:hidden">
                            <img src="/sekure-logo.svg" alt="Sekure" className="h-6 w-6" />
                            <span className="font-bold text-gray-800 dark:text-white">Sekure</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Language selector */}
                        <div className="relative" ref={langRef}>
                            <button
                                onClick={() => setLangOpen(!langOpen)}
                                className="theme-toggle-btn flex items-center gap-1.5 text-sm"
                            >
                                <img src={currentLang.flag} alt={currentLang.label} className="w-5 h-4 rounded-sm object-cover" />
                                <span className="hidden sm:inline">{currentLang.label}</span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {langOpen && (
                                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[140px] z-50 animate-fade-in">
                                    {LANGUAGES.map((l) => (
                                        <button
                                            key={l.code}
                                            onClick={() => {
                                                setLang(l.code);
                                                setLangOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${lang === l.code
                                                ? 'bg-sekure-50 text-sekure-700 dark:bg-sekure-600/15 dark:text-sekure-400'
                                                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <img src={l.flag} alt={l.label} className="w-5 h-4 rounded-sm object-cover" />
                                            <span>{l.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="theme-toggle-btn"
                            title={theme === 'light' ? t('nav.dark_mode') : t('nav.light_mode')}
                        >
                            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </button>

                        <button onClick={handleLogout} className="btn-ghost text-red-500 dark:text-red-400 lg:hidden">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto">
                    <div className="max-w-5xl mx-auto animate-fade-in">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
