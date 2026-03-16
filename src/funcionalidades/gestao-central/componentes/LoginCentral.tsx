import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Loader2, LogIn } from 'lucide-react';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';

export default function LoginCentral() {
    const [loading, definirLoading] = useState(false);
    const [erro, definirErro] = useState('');

    const navigate = useNavigate();
    const { entrar, usuarioAtual } = usarAutenticacao();

    // Valida se o usuário está autenticado e se é o email correto
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
            await entrar({ login_hint: 'madebycotrim@gmail.com' });
            // O useEffect acima validará o email e redirecionará
        } catch (err: any) {
            definirLoading(false);
            definirErro('Erro ao entrar com Google. Tente novamente.');
            console.error('Erro de autenticação:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background grid sutil */}
            <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
            }}></div>

            {/* Orb de luz sutil */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-slate-700/10 rounded-full blur-3xl"></div>

            <div className="max-w-md w-full relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/80 mb-6">
                        <ShieldAlert className="text-slate-400" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">SCAE</h1>
                    <p className="text-slate-400 mt-2 text-sm font-medium">Central de Administração</p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                        <p className="text-slate-600 text-xs font-mono">Sistema Restrito</p>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-slate-800/60 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
                    {erro && (
                        <div className="p-4 bg-slate-800/40 border border-slate-700/80 rounded-xl text-slate-300 text-sm text-center mb-6">
                            <p className="font-medium">{erro}</p>
                        </div>
                    )}

                    {/* Google Sign In Button */}
                    <button
                        onClick={lidarComLoginGoogle}
                        disabled={loading}
                        className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700 text-slate-100 font-medium py-3 rounded-xl transition-all flex justify-center items-center gap-3 text-sm border border-slate-700/80 hover:border-slate-700/80"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Autenticando...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <span>Entrar com Google</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

