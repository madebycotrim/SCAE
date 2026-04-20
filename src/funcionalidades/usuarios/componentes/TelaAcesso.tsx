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

                toast.success('Login realizado com sucesso!', {
                    style: { background: '#10b981', color: '#fff' },
                    iconTheme: { primary: '#fff', secondary: '#10b981' }
                });
                
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
        <div className="flex min-h-screen w-full font-sans overflow-hidden relative bg-[#0B0F19] text-white selection:bg-blue-500/30">
            
            {/* --- PREMIUM DYNAMIC BACKGROUND --- */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Tech GridHUD */}
                <div 
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(43, 89, 255, 0.4) 1px, transparent 0)',
                        backgroundSize: '40px 40px'
                    }}
                />
                
                {/* Animated Orbs */}
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.4, 0.3],
                        x: [0, 100, 0],
                        y: [0, -50, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/30 blur-[140px] rounded-full" 
                />
                
                <motion.div 
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.3, 0.2],
                        x: [0, -80, 0],
                        y: [0, 80, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-indigo-700/20 blur-[150px] rounded-full" 
                />

                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/80 to-transparent" />
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10 w-full max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[1100px] rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row min-h-[650px] bg-[#111827]/60 backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_-20px_rgba(43,89,255,0.2)] relative"
                >
                    {/* Linha de brilho no topo do card */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

                    {/* Left Column (Branding) */}
                    <div className="lg:w-[45%] p-10 lg:p-16 relative flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/5 overflow-hidden">
                        
                        {/* Brilho interno sutil */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />

                        <div className="relative z-10">
                            {/* Logo */}
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/10 relative overflow-hidden group">
                                    <ShieldCheck className="w-6 h-6 text-white relative z-10" />
                                    <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                                </div>
                                <span className="text-2xl font-black text-white tracking-tighter uppercase italic">
                                    Catraki<span className="text-blue-500">.</span>
                                </span>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mt-20"
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 shadow-sm mb-8 backdrop-blur-md">
                                    <Building2 className="w-4 h-4 text-blue-400" />
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{nomeEscola}</span>
                                </div>
                                <h2 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight mb-6">
                                    Segurança<br />
                                    inteligente da<br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 animate-gradient-x">
                                        borda à nuvem.
                                    </span>
                                </h2>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
                                    Painel administrativo unificado. Gerencie acessos, controle evasões e extraia relatórios em tempo real.
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
                            <div className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md w-fit group cursor-default shadow-xl shadow-black/20">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-[#0B0F19] rounded-xl border border-white/10 text-blue-400 group-hover:text-white transition-colors group-hover:bg-blue-500 group-hover:border-blue-400">
                                        <Fingerprint size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="p-2 bg-[#0B0F19] rounded-xl border border-white/10 text-indigo-400 group-hover:text-white transition-colors group-hover:bg-indigo-500 group-hover:border-indigo-400">
                                        <QrCode size={18} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tecnologia Híbrida</span>
                                    <span className="text-[11px] font-black text-white uppercase tracking-widest leading-none">Biometria & QR Code</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column (Auth Action) */}
                    <div className="flex-1 p-10 lg:p-16 flex flex-col items-center justify-center relative bg-[#0B0F19]/40">
                        {/* Blob de destaque sutil atrás do formulário */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="w-full max-w-[380px] flex flex-col items-center relative z-10"
                        >
                            <div className="text-center mb-10 w-full">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-6 border border-white/10">
                                    <ShieldCheck className="w-8 h-8 text-blue-400" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight mb-3">Portal Administrativo</h3>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                    Utilize seu e-mail institucional {dominioEmail ? <span className="text-blue-400 font-bold">@{dominioEmail}</span> : 'cadastrado'} <br/>para validar sua credencial.
                                </p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleLogin('user')}
                                disabled={carregando}
                                className="group w-full flex items-center justify-between gap-4 py-4 px-6 bg-white text-slate-900 rounded-2xl font-black uppercase text-[11px] tracking-[0.15em] shadow-xl shadow-white/5 hover:shadow-white/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed border border-white/20"
                            >
                                <div className="flex items-center gap-4">
                                    {carregando ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                    ) : (
                                        provedorAuth === 'microsoft' ? (
                                            <svg width="20" height="20" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                        )
                                    )}
                                    <span className="mt-0.5">{carregando ? 'Validando Credencial...' : `Entrar com ${provedorAuth === 'microsoft' ? 'Microsoft' : 'Google'}`}</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors group-hover:translate-x-1" />
                            </motion.button>

                            <AnimatePresence>
                                {erro && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                        className="w-full overflow-hidden mt-6"
                                    >
                                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[10px] font-black uppercase tracking-widest text-center shadow-lg shadow-rose-500/5">
                                            {erro}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Decorative lock line */}
                            <div className="w-full flex items-center justify-center gap-4 mt-12 opacity-40">
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/20" />
                                <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Ambiente Seguro</span>
                                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/20" />
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Footer Brand */}
                <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 opacity-40 hover:opacity-100 transition-opacity z-20">
                    <span
                        onClick={lidarComCliqueAdmin}
                        className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] cursor-default select-none hover:text-blue-400 transition-colors"
                    >
                        Catraki Operational Edge v4.5
                    </span>
                </div>
            </div>
        </div>
    );
}
