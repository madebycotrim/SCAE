import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { usarEscola } from '@/escola/ProvedorEscola';
import { ShieldCheck, Fingerprint, QrCode, Building2, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/compartilhado/servicos/api';
import { Registrador } from '@/compartilhado/servicos/auditoria';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { EMAIL_RAIZ } from '@/compartilhado/constantes/seguranca';

const log = criarRegistrador('Login');

export default function TelaAcesso() {
    const { entrar, sair, usuarioAtual } = usarAutenticacao();
    const navegar = useNavigate();
    const { slugEscola } = useParams();
    const { nomeEscola, dominioEmail, provedorAuth } = usarEscola();

    const [erro, definirErro] = useState('');
    const [carregando, definirCarregando] = useState(false);
    const [validando, definirValidando] = useState(false);
    const [cliquesAdmin, definirCliquesAdmin] = useState(0);

    // 🛡️ Monitor de Autenticação (Pós-Redirecionamento)
    useEffect(() => {
        const validarAcesso = async () => {
            if (!usuarioAtual || validando) return;

            definirValidando(true);
            definirCarregando(true);

            try {
                const email = usuarioAtual.email?.toLowerCase() || '';
                const ehMadeByCotrim = email.trim() === EMAIL_RAIZ.toLowerCase();

                // 1. Validação de Domínio (se aplicável)
                if (dominioEmail && !ehMadeByCotrim) {
                    const temDominioCerto = email.endsWith(dominioEmail.toLowerCase());
                    if (!temDominioCerto) {
                        await sair();
                        throw new Error(`ACESSO NEGADO: Use seu e-mail @${dominioEmail.replace('@', '')}.`);
                    }
                }

                // 2. Validação de Vínculo na Escola (se não for ROOT)
                if (!ehMadeByCotrim) {
                    try {
                        const perfil = await api.obter<any>('/seguranca/perfil');
                        if (!perfil) {
                            await sair();
                            throw new Error('ACESSO NEGADO: Usuário não cadastrado nesta escola.');
                        }
                    } catch (e) {
                        await sair();
                        throw new Error('ACESSO NEGADO: Não foi possível validar seu acesso.');
                    }
                }

                toast.success('Login realizado com sucesso!');

                await Registrador.registrar('LOGIN_SUCESSO', 'sistema', 'auth', { email });
                navegar(`/${slugEscola}/admin/painel`, { replace: true });

            } catch (err: any) {
                definirErro(err.message);
                toast.error(err.message, {
                    style: { background: '#ef4444', color: '#fff', borderRadius: '1rem' }
                });
            } finally {
                definirCarregando(false);
                definirValidando(false);
            }
        };

        validarAcesso();
    }, [usuarioAtual, slugEscola, dominioEmail, navegar, sair]);

    const handleLogin = async (tipo: 'admin' | 'user') => {
        definirCarregando(true);
        definirErro('');

        try {
            const params: Record<string, string> = {};
            if (dominioEmail && tipo !== 'admin') {
                params.hd = dominioEmail.replace('@', '');
            }

            await entrar(params, provedorAuth);

        } catch (error: any) {
            log.error('Erro ao iniciar login', error);
            definirErro('Não foi possível iniciar o login. Tente novamente.');
            definirCarregando(false);
        }
    };

    const lidarComCliqueAdmin = () => {
        const novoTotal = cliquesAdmin + 1;
        if (novoTotal >= 3) {
            definirCliquesAdmin(0);
            handleLogin('admin');
        } else {
            definirCliquesAdmin(novoTotal);
            setTimeout(() => definirCliquesAdmin(0), 2000);
        }
    };

    return (
        <div className="flex min-h-screen w-full font-sans overflow-hidden relative bg-[#F8FAFC] text-slate-900 selection:bg-blue-500/20">

            {/* --- INSTITUTIONAL DYNAMIC BACKGROUND --- */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Clean Dot Grid */}
                <div
                    className="absolute inset-0 opacity-[0.5]"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.04) 1px, transparent 0)',
                        backgroundSize: '32px 32px'
                    }}
                />

                {/* Pure Corporate Soft Blobs (Blue/Indigo) */}
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.15, 0.25, 0.15],
                        x: [0, 60, 0],
                        y: [0, -30, 0]
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-300 blur-[130px] rounded-full"
                />

                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1],
                        x: [0, -40, 0],
                        y: [0, 50, 0]
                    }}
                    transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[10%] right-[5%] w-[40%] h-[40%] bg-indigo-300 blur-[130px] rounded-full"
                />
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10 w-full max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[1100px] rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row min-h-[600px] bg-white border border-slate-200/60 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.08)] relative"
                >
                    {/* Left Column (Branding) */}
                    <div className="lg:w-[45%] p-10 lg:p-16 relative flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 overflow-hidden bg-slate-50/50">

                        {/* Brilho interno sutil p/ quebrar o tom sólido */}
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-blue-50/50 to-transparent pointer-events-none" />

                        <div className="relative z-10">
                            {/* Logo */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md shadow-blue-900/5 border border-slate-200 relative overflow-hidden group p-1.5">
                                    <img src="/logo.png" alt="Catraki" className="w-full h-full object-contain relative z-10" />
                                    <div className="absolute inset-0 bg-blue-50 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                                </div>
                                <span className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
                                    Catraki<span className="text-blue-600 animate-pulse">.</span>
                                </span>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mt-16 sm:mt-20"
                            >
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm mb-6">
                                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{nomeEscola}</span>
                                </div>
                                <h2 className="text-4xl sm:text-5xl font-black text-slate-900 leading-[1.05] tracking-tight mb-5">
                                    Segurança<br />
                                    institucional<br />
                                    <span className="text-blue-700">
                                        inteligente.
                                    </span>
                                </h2>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm">
                                    Acesso restrito à gestão e secretaria. Identifique e acompanhe o fluxo escolar em tempo real, num só lugar.
                                </p>
                            </motion.div>
                        </div>

                        {/* Status Pills */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="relative z-10 mt-12 lg:mt-0"
                        >
                            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 w-fit group cursor-default shadow-lg shadow-slate-200/50">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <Fingerprint size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <QrCode size={16} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div className="flex flex-col pr-4">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tecnologia</span>
                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Biometria & QR Code</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column (Auth Action) */}
                    <div className="flex-1 p-10 lg:p-16 flex flex-col items-center justify-center relative bg-white">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="w-full max-w-[360px] flex flex-col items-center relative z-10"
                        >
                            <div className="text-center mb-10 w-full">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Portal Administrativo</h3>
                                <div className="h-1 w-12 bg-blue-600 mx-auto rounded-full mb-4" />
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                    Utilize seu e-mail corporativo institucional {dominioEmail ? <span className="text-blue-600 font-bold">@{dominioEmail}</span> : ''} <br className="hidden sm:block" />para validar as suas credenciais.
                                </p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => handleLogin('user')}
                                disabled={carregando}
                                className="group w-full flex items-center justify-between gap-4 py-4 px-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.15em] shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed border border-transparent hover:border-slate-700"
                            >
                                <div className="flex items-center gap-4">
                                    {carregando ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                                    ) : (
                                        provedorAuth === 'microsoft' ? (
                                            <svg width="20" height="20" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" /><rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" /></svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        )
                                    )}
                                    <span className="mt-0.5">{carregando ? 'Validando...' : `Entrar com ${provedorAuth === 'microsoft' ? 'Microsoft' : 'Google'}`}</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors group-hover:translate-x-1" />
                            </motion.button>

                            <AnimatePresence>
                                {erro && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                        className="w-full overflow-hidden mt-6"
                                    >
                                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase tracking-widest text-center">
                                            {erro}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Decorative line */}
                            <div className="w-full flex items-center justify-center gap-4 mt-12 opacity-60">
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                                <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Acesso Restrito</span>
                                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
