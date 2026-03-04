import { ReactNode } from 'react';
import { ShieldAlert, Building2, Users, FileText, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';

export function LayoutCentral({ children }: { children: ReactNode }) {
    const { usuarioAtual, sair } = usarAutenticacao();
    const navigate = useNavigate();

    const logout = async () => {
        await sair();
        navigate('/central/login', { replace: true });
    };

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
            {/* Sidebar Dark SaaS - Alinhada ao estilo premium */}
            <aside className="w-68 bg-slate-900 border-r border-slate-800/50 flex flex-col z-30 shadow-2xl">
                <div className="h-[72px] px-6 border-b border-slate-800/50 flex items-center gap-3 bg-slate-900/50 backdrop-blur-md sticky top-0">
                    <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-400 shadow-lg">
                        <ShieldAlert size={22} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black tracking-tight text-white uppercase">SCAE <span className="text-indigo-500">CENTRAL</span></h1>
                        <p className="text-[10px] font-black text-slate-500 mt-0.5 uppercase tracking-widest">Master Control</p>
                    </div>
                </div>

                <nav className="flex-1 p-5 space-y-1 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-3 mb-4 mt-6">Governança Global</p>

                    <ItemMenu to="/central/painel" icone={ShieldAlert} label="Painel Mestre" />
                    <ItemMenu to="/central/escolas" icone={Building2} label="Escolas" />
                    <ItemMenu to="/central/usuarios" icone={Users} label="Usuários Master" />
                    <ItemMenu to="/central/logs" icone={FileText} label="Auditoria Global" />
                </nav>

                <div className="p-5 border-t border-slate-800/50 bg-slate-900/80 backdrop-blur-sm sticky bottom-0">
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800/50 mb-4 shadow-inner">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 text-center">Operador de Infraestrutura</p>
                        <p className="text-xs font-bold text-indigo-300 truncate text-center">{usuarioAtual?.email || 'root@scae.core'}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-2.5 w-full py-3 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest border border-transparent hover:border-rose-500/20 active:scale-[0.98] outline-none"
                    >
                        <LogOut size={16} /> Encerrar Sessão
                    </button>
                </div>
            </aside>

            {/* Main Content Space */}
            <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
                {/* Background Decorator */}
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-600/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex-1 overflow-auto custom-scrollbar relative z-10">
                    <div className="p-8 max-w-7xl mx-auto min-h-full">
                        {children}
                    </div>
                </div>

                {/* Footer Minimalista */}
                <footer className="h-10 border-t border-slate-800/30 px-8 flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest relative z-10">
                    <span>SCAE Infra v2.4.0</span>
                    <span>Latência: 12ms</span>
                </footer>
            </main>
        </div>
    );
}

function ItemMenu({ to, icone: Icone, label }: { to: string, icone: any, label: string }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all group ${isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`
            }
        >
            <Icone size={18} className="shrink-0 transition-transform group-hover:scale-110" />
            <span className="uppercase tracking-tight">{label}</span>
        </NavLink>
    );
}
