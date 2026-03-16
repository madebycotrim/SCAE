import { ReactNode } from 'react';
import { ShieldAlert, Building2, LogOut } from 'lucide-react';
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
        <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-black selection:text-white">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                <div className="h-[76px] px-8 border-b border-slate-100 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl shadow-slate-200 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <ShieldAlert size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase italic">SCAE</h1>
                        <p className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-[0.2em]">Central Hub</p>
                    </div>
                </div>

                <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-3 mb-5 mt-4">Sistema de Gestão</p>

                    <ItemMenu to="/central/escolas" icone={Building2} label="Unidades Escolares" />
                </nav>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 sticky bottom-0">
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/60 mb-5 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 text-center">Operador Ativo</p>
                        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-slate-900 border border-slate-200 shadow-sm shrink-0">
                                <UserIcon size={16} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">
                                    {usuario?.nome_completo || usuarioAtual?.displayName || 'Operador'}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 truncate tracking-wider">
                                    {mascararEmail(usuarioAtual?.email)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-3 w-full py-3.5 text-slate-500 hover:bg-slate-900 hover:text-white rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-[0.2em] border border-slate-200 hover:border-slate-900 active:scale-[0.97] outline-none group shadow-sm"
                    >
                        <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> Encerrar Sessão
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Minimalist Decorator */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-200/20 blur-[120px] rounded-full pointer-events-none -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-slate-100/40 blur-[100px] rounded-full pointer-events-none -ml-24 -mb-24"></div>

                <div className="flex-1 overflow-auto custom-scrollbar relative z-10 scroll-smooth">
                    <div className="p-10 max-w-7xl mx-auto min-h-full">
                        {children}
                    </div>
                </div>

                {/* Footer */}
                <footer className="h-12 border-t border-slate-200 bg-white/80 backdrop-blur-sm px-10 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] relative z-10">
                    <div className="flex items-center gap-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span>SCAE v2.4.0</span>
                    </div>
                    <span className="text-slate-300">© 2026 • MadeByCotrim</span>
                </footer>
            </main>
        </div>
    );
}

function ItemMenu({ to, icone: Icone, label }: { to: string, icone: any, label: string }) {
    return (
        <NavLink
            to={to}
            end={to === '/central'}
            className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-3.5 rounded-xl text-[11px] font-black transition-all duration-300 group relative ${isActive
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-x-1'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent translate-x-0'
                }`
            }
        >
            {({ isActive }) => (
                <>
                    <Icone
                        size={18}
                        strokeWidth={isActive ? 2.5 : 2}
                        className={`shrink-0 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                    />
                    <span className="uppercase tracking-widest">{label}</span>
                    <div className={`absolute left-0 w-1 bg-white rounded-full transition-all duration-500 ${isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'}`}></div>
                </>
            )}
        </NavLink>
    );
}

export default LayoutCentral;
