import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { lockVault } from '../api';
import toast from 'react-hot-toast';
import {
    Shield, KeyRound, ShieldCheck, Archive,
    Lock, Menu, X,
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    onLock: () => void;
}

const navItems = [
    { to: '/generator', icon: KeyRound, label: 'Generador' },
    { to: '/checker', icon: ShieldCheck, label: 'Verificador' },
    { to: '/vault', icon: Archive, label: 'Bóveda' },
];

export default function Layout({ children, onLock }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const handleLock = async () => {
        try {
            await lockVault();
            toast.success('Bóveda bloqueada');
            onLock();
        } catch {
            toast.error('Error al bloquear');
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex flex-col w-72 bg-gray-900/50 border-r border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-gradient-to-br from-sekure-500 to-sekure-700 rounded-xl flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Sekure</h1>
                        <p className="text-xs text-gray-500">Gestor de Contraseñas</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                isActive ? 'sidebar-link-active' : 'sidebar-link'
                            }
                        >
                            <Icon className="w-5 h-5" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <button onClick={handleLock} className="sidebar-link text-red-400 hover:text-red-300 hover:bg-red-600/10 mt-4">
                    <Lock className="w-5 h-5" />
                    Bloquear
                </button>
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative w-72 bg-gray-900 border-r border-gray-800 p-6 z-10 flex flex-col animate-fade-in">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-sekure-500 to-sekure-700 rounded-xl flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-xl font-bold">Sekure</h1>
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="btn-ghost">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <nav className="flex-1 space-y-2">
                            {navItems.map(({ to, icon: Icon, label }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        isActive ? 'sidebar-link-active' : 'sidebar-link'
                                    }
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </NavLink>
                            ))}
                        </nav>

                        <button onClick={handleLock} className="sidebar-link text-red-400 hover:text-red-300 hover:bg-red-600/10 mt-4">
                            <Lock className="w-5 h-5" />
                            Bloquear
                        </button>
                    </aside>
                </div>
            )}

            {/* Main content */}
            <main className="flex-1 flex flex-col min-h-screen">
                {/* Mobile header */}
                <header className="lg:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
                    <button onClick={() => setSidebarOpen(true)} className="btn-ghost">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-sekure-500" />
                        <span className="font-bold">Sekure</span>
                    </div>
                    <button onClick={handleLock} className="btn-ghost text-red-400">
                        <Lock className="w-5 h-5" />
                    </button>
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
