import { ReactNode } from 'react';
import { ShieldAlert, Building2, Users, FileText, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { usarPermissoes } from '@/compartilhado/autorizacao/ContextoPermissoes';
import { mascararEmail } from '@/compartilhado/utils/formatar';
import { User as UserIcon } from 'lucide-react';

export function LayoutCentral({ children }: { children: ReactNode }) {
    const { usuarioAtual, sair } = usarAutenticacao();
    const { usuario } = usarPermissoes();
    const navigate = useNavigate();

    const logout = async () => {
        await sair();
        navigate('/central/login', { replace: true });
    };

    return (
        <div className="flex min-h-screen bg-black text-slate-100 font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-slate-900/80 border-r border-slate-800/80 flex flex-col z-30 shadow-2xl">
                <div className="h-[72px] px-6 border-b border-slate-800/80 flex items-center gap-3 bg-slate-800/60 backdrop-blur-md sticky top-0">
                    <div className="w-10 h-10 bg-slate-800/50 rounded-xl flex items-center justify-center border border-slate-700/80 text-slate-300 shadow-lg">
                        <ShieldAlert size={22} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black tracking-tight text-slate-100 uppercase">SCAE</h1>
                        <p className="text-[10px] font-black text-slate-600 mt-0.5 uppercase tracking-widest">Central</p>
                    </div>
                </div>

                <nav className="flex-1 p-5 space-y-1 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-3 mb-4 mt-6">Governança</p>

                    <ItemMenu to="/central" icone={ShieldAlert} label="Painel" />
                    <ItemMenu to="/central/escolas" icone={Building2} label="Escolas" />
                    <ItemMenu to="/central/usuarios" icone={Users} label="Usuários" />
                    <ItemMenu to="/central/auditoria" icone={FileText} label="Auditoria" />
                </nav>

                <div className="p-5 border-t border-slate-800/80 bg-slate-800/60 backdrop-blur-sm sticky bottom-0">
                    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-800/80 mb-4 shadow-inner">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 text-center">Operador</p>
                        <div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                            <div className="w-8 h-8 rounded-lg bg-slate-800/40 flex items-center justify-center text-slate-400 border border-slate-700/80 shrink-0">
                                <UserIcon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-slate-100 truncate uppercase tracking-tight">
                                    {usuario?.nome_completo || usuarioAtual?.displayName || 'USUÁRIO'}
                                </p>
                                <p className="text-[9px] font-bold text-slate-600 truncate tracking-wider">
                                    {mascararEmail(usuarioAtual?.email)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-2.5 w-full py-3 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest border border-slate-800 hover:border-slate-700/80 active:scale-[0.98] outline-none"
                    >
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden relative">
                {/* Background Decorator */}
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-slate-700/5 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-slate-700/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex-1 overflow-auto custom-scrollbar relative z-10">
                    <div className="p-8 max-w-7xl mx-auto min-h-full">
                        {children}
                    </div>
                </div>

                {/* Footer */}
                <footer className="h-10 border-t border-slate-800/80 px-8 flex items-center justify-center text-[10px] font-black text-slate-700 uppercase tracking-widest relative z-10">
                    <span>SCAE v2.4.0 • Sistema Restrito</span>
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
                    ? 'bg-slate-800 text-slate-100 shadow-lg shadow-slate-950/50 border border-slate-700/80'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-300 border border-transparent'
                }`
            }
        >
            <Icone size={18} className="shrink-0 transition-transform group-hover:scale-110" />
            <span className="uppercase tracking-tight">{label}</span>
        </NavLink>
    );
}

export default LayoutCentral;
