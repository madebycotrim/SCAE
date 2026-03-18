import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';

export default function LoginCentral() {
    const [loading, definirLoading] = useState(false);
    const [erro, definirErro] = useState('');

    const navigate = useNavigate();
    const { entrar, usuarioAtual } = usarAutenticacao();

    useEffect(() => {
        if (usuarioAtual) {
            if (usuarioAtual.email === 'madebycotrim@gmail.com') {
                navigate('/central');
            } else {
                definirErro(`Acesso Negado. Email não autorizado: ${usuarioAtual.email}`);
                definirLoading(false);
            }
        }
    }, [usuarioAtual, navigate]);

    const lidarComLoginGoogle = async () => {
        definirLoading(true);
        definirErro('');

        try {
            await entrar();
        } catch (err: any) {
            definirLoading(false);
            definirErro('Erro ao entrar com Google. Tente novamente.');
            console.error('Erro de autenticação:', err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-black selection:text-white">
            {/* Elementos Minimalistas de Fundo */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-slate-200/40 blur-[150px] rounded-full group-hover:bg-slate-300 transition-colors duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white blur-[100px] rounded-full pointer-events-none"></div>

            <div className="max-w-xl w-full relative z-10 animate-fade-in">
                {/* Seção de Cabeçalho */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-slate-900 shadow-2xl shadow-slate-300 mb-8 -rotate-6 hover:rotate-0 transition-transform duration-500 group">
                        <ShieldAlert className="text-white" size={40} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-tight">SCAE</h1>
                    <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-[0.5em] italic">Terminal de Inteligência Central</p>
                </div>

                {/* Card Principal */}
                <div className="bg-white border border-slate-200 rounded-2xl p-12 md:p-16 shadow-[0_32px_120px_-20px_rgba(0,0,0,0.08)] relative overflow-hidden">
                    {/* Elemento Decorativo Interno */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="mb-10 text-center">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic mb-2">Autenticação Obrigatória</h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60">Acesso exclusivo para administradores master</p>
                        </div>

                        {erro && (
                            <div className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-[11px] font-black uppercase tracking-wider text-center mb-8 italic animate-shake">
                                {erro}
                            </div>
                        )}

                        <button
                            onClick={lidarComLoginGoogle}
                            disabled={loading}
                            className="group w-full h-20 bg-slate-900 hover:bg-black disabled:bg-slate-800 text-white rounded-2xl transition-all duration-500 flex justify-center items-center gap-5 shadow-2xl shadow-slate-200 active:scale-[0.98] relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer"></div>

                            {loading ? (
                                <>
                                    <div className="w-6 h-6 border-[3px] border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">Validando...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-500" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em] group-hover:tracking-[0.4em] transition-all duration-500">
                                        Acessar com Google Workspace
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Créditos de Rodapé */}
                <div className="mt-12 text-center opacity-30 group hover:opacity-100 transition-opacity duration-1000">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">© 2026 SCAE CENTRAL • PROTOCOLO ZERO</p>
                </div>
            </div>
        </div>
    );
}
