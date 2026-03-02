import { ReactNode } from 'react';
import { ShieldAlert, Building2, Users, FileText, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';

export function LayoutAGM({ children }: { children: ReactNode }) {
    const { usuarioAtual, sair } = usarAutenticacao();
    const navigate = useNavigate();

    const handleSair = async () => {
        await sair();
        navigate('/agm/login', { replace: true });
    };

    return (
        <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans">
            {/* Sidebar Dark SaaS */}
            <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col z-30">
                <div className="p-6 border-b border-slate-700 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center border border-indigo-500/30 text-indigo-400">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold tracking-wide text-white">SCAE <span className="text-indigo-400">AGM</span></h1>
                        <p className="text-[11px] text-slate-500 mt-0.5">System Core</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-3 mb-3 mt-2">Gerenciamento</p>
                    <NavLink
                        to="/agm/painel"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`
                        }
                    >
                        <ShieldAlert size={18} /> Painel Mestre
                    </NavLink>
                    <NavLink
                        to="/agm/escolas"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`
                        }
                    >
                        <Building2 size={18} /> Escolas (Tenants)
                    </NavLink>
                    <NavLink
                        to="/agm/usuarios"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`
                        }
                    >
                        <Users size={18} /> Base de Usuários
                    </NavLink>
                    <NavLink
                        to="/agm/logs"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`
                        }
                    >
                        <FileText size={18} /> Auditoria Global
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-slate-700 flex flex-col gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-700">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Operador Root</p>
                        <p className="text-sm font-medium text-white truncate">{usuarioAtual?.email?.split('@')[0] || 'agm_root'}</p>
                    </div>
                    <button
                        onClick={handleSair}
                        className="flex items-center justify-center gap-2 w-full py-2.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-colors text-sm font-medium"
                    >
                        <LogOut size={16} /> Terminar Sessão
                    </button>
                </div>
            </aside>

            {/* Main Content Space */}
            <main className="flex-1 overflow-auto bg-slate-900 custom-scrollbar">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
