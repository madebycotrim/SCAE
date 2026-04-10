import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { usarEscola } from '@/escola/ProvedorEscola';
import { ShieldCheck, Lock, QrCode, ScanLine, Fingerprint, Check, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/compartilhado/servicos/api';
import { Registrador } from '@/compartilhado/servicos/auditoria';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { EMAIL_RAIZ } from '@/compartilhado/constantes/seguranca';

const log = criarRegistrador('Login');

export default function TelaAcesso() {
    const { entrar, sair } = usarAutenticacao();
    const navegar = useNavigate();
    const { slugEscola } = useParams();
    const { nomeEscola, dominioEmail, provedorAuth } = usarEscola();

    const [erro, definirErro] = useState('');
    const [carregando, definirCarregando] = useState(false);
    const [cliquesAdmin, definirCliquesAdmin] = useState(0);

    const lidarComCliqueAdmin = () => {
        const novoTotal = cliquesAdmin + 1;
        if (novoTotal >= 3) {
            definirCliquesAdmin(0);
            handleLogin('admin');
        } else {
            definirCliquesAdmin(novoTotal);
            // Resetar cliques após 2 segundos de inatividade
            setTimeout(() => definirCliquesAdmin(0), 2000);
        }
    };

    const handleLogin = async (tipo: 'admin' | 'user') => {
        definirCarregando(true);
        definirErro('');

        try {
            const params: Record<string, string> = {};
            if (dominioEmail && tipo !== 'admin') {
                const dominioLimpo = dominioEmail.replace('@', '');
                params.hd = dominioLimpo; // Google Hosted Domain
                // Note: Microsoft tenant is validated server-side
                params.login_hint = `@${dominioLimpo}`;
            }
            const resultado = await entrar(params, provedorAuth) as { user: { email: string } };
            const usuario = resultado.user;
            const email = usuario.email;

            // 1. Regra de ROOT (Sempre permite se for o desenvolvedor)
            const ehMadeByCotrim = email.trim().toLowerCase() === EMAIL_RAIZ.toLowerCase();

            if (tipo === 'admin') {
                if (!ehMadeByCotrim) {
                    await sair();
                    throw new Error('ACESSO NEGADO: Este botão é de uso exclusivo da manutenção central do sistema.');
                }
            } else if (dominioEmail && !email.endsWith(dominioEmail)) {
                await sair();
                throw new Error(`ACESSO NEGADO: Apenas emails institucionais (@${dominioEmail}) são permitidos para esta escola.`);
            }

            // 2. VERIFICAÇÃO DE VÍNCULO (Obrigatório se não for ROOT)
            if (!ehMadeByCotrim) {
                try {
                    // Tenta buscar o perfil do usuário para esta escola específica
                    // A api.ts já injeta o X-Escola-ID automaticamente
                    const perfil = await api.obter<any>('/seguranca/perfil');
                    
                    if (!perfil) {
                        await sair();
                        throw new Error('ACESSO NEGADO: Seu e-mail é institucional, mas você ainda não foi cadastrado na equipe desta escola.');
                    }

                    if (!perfil.ativo) {
                        await sair();
                        throw new Error('ACESSO NEGADO: Seu acesso está temporariamente bloqueado. Procure a direção.');
                    }
                } catch (errPerfil) {
                    await sair();
                    log.error('Erro ao validar vínculo no login', errPerfil);
                    throw new Error('ACESSO NEGADO: Não foi possível validar seu vínculo com esta escola. Você está cadastrado?');
                }
            }

            toast.success('Login realizado com sucesso!');

            await Registrador.registrar('LOGIN_SUCESSO', 'sistema', 'auth', {
                email: email,
                tipo_login: tipo
            });

            navegar(`/${slugEscola}/admin/painel`);

        } catch (error) {
            log.error('Erro no login', error);
            let mensagem = error.message;
            if (error?.code === 'auth/popup-closed-by-user') mensagem = 'Login cancelado pelo usuário.';
            if (error?.code === 'auth/network-request-failed') mensagem = 'Erro de conexão. Verifique sua internet.';

            definirErro(mensagem);
            toast.error(mensagem);
            await sair();
        } finally {
            definirCarregando(false);
        }
    };

    return (
        <div
            className="flex min-h-screen w-full font-sans overflow-hidden relative bg-[#050810]"
        >
            {/* Mesh Gradient Animado de Fundo */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
                <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-emerald-500/5 blur-[100px] rounded-full animate-pulse [animation-delay:4s]" />
            </div>

            <div className="flex-1 flex items-center justify-center p-5 md:p-10 relative z-10">

                {/* Card principal com Glassmorphism Supremo */}
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-[1040px] rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row min-h-[620px] bg-white/[0.02] backdrop-blur-3xl border border-white/10"
                    style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)' }}
                >

                    {/* ─── PAINEL ESQUERDO (Conceitual) ─── */}
                    <div
                        className="md:w-[50%] p-16 relative flex flex-col justify-between overflow-hidden border-r border-white/5"
                    >
                        {/* Elementos Flutuantes 3D-like */}
                        <motion.div 
                            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-[15%] right-[10%] opacity-[0.08]"
                        >
                            <QrCode className="w-32 h-32 text-white" strokeWidth={0.5} />
                        </motion.div>
                        <motion.div 
                            animate={{ y: [0, 20, 0], rotate: [0, -8, 0] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-[20%] right-[15%] opacity-[0.05]"
                        >
                            <Fingerprint className="w-40 h-40 text-white" strokeWidth={0.5} />
                        </motion.div>

                        {/* Logo Catraki Estilizado */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-2xl font-black text-white tracking-tighter uppercase italic">
                                    Catraki<span className="text-indigo-500 animate-pulse">.</span>
                                </span>
                            </div>
                        </div>

                        {/* Conteúdo Central */}
                        <div className="relative z-10 mt-12 mb-12">
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.05] border border-white/10 mb-8"
                            >
                                <Building2 className="w-4 h-4 text-indigo-400" />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{nomeEscola}</span>
                            </motion.div>

                            <h2 className="text-[2.8rem] font-black text-white leading-[1.1] tracking-tight mb-6">
                                Inteligência<br />
                                em cada<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-500">movimento.</span>
                            </h2>
                            
                            <p className="text-slate-400 text-base leading-relaxed max-w-[22rem]">
                                A plataforma definitiva para gestão de acesso escolar, integrando hardware e nuvem em tempo real.
                            </p>
                        </div>

                        {/* Footer Esquerdo */}
                        <div className="relative z-10 flex items-center gap-6">
                            <div className="flex -space-x-3">
                                {[1,2,3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0A1121] bg-slate-800" />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">+400 escolas ativas</span>
                        </div>
                    </div>

                    {/* ─── PAINEL DIREITO (Login) ─── */}
                    <div className="md:w-[50%] p-16 flex flex-col bg-white/5 relative items-center justify-center">
                        <div className="w-full max-w-[320px]">
                            
                            {/* Cabeçalho do Login */}
                            <div className="text-center mb-10">
                                <h3 className="text-3xl font-black text-white tracking-tight mb-2">Acesso</h3>
                                <p className="text-slate-400 text-sm font-medium">Use sua identidade institucional</p>
                            </div>

                            {/* Badge do Domínio */}
                            {dominioEmail && (
                                <div className="flex justify-center mb-12">
                                    <div className="p-[1px] rounded-full bg-gradient-to-r from-indigo-500/50 to-transparent">
                                        <div className="px-6 py-3 bg-slate-900/40 backdrop-blur-md rounded-full flex items-center gap-3 border border-white/5">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                            <span className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.15em]">{dominioEmail}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Botão de Login VIP */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleLogin('user')}
                                disabled={carregando}
                                className="w-full group relative flex items-center justify-center gap-4 py-4 px-6 bg-white text-slate-900 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.15em] shadow-2xl shadow-white/5 overflow-hidden transition-all"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                
                                {provedorAuth === 'microsoft' ? (
                                    <svg width="20" height="20" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                )}
                                <span>Entrar agora</span>
                            </motion.button>

                            {/* Erros e Alertas */}
                            <AnimatePresence>
                                {erro && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[10px] font-black uppercase tracking-widest text-center"
                                    >
                                        {erro}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Footer do Login */}
                            <div className="mt-12 pt-8 border-t border-white/5 text-center">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Ambiente Seguro 256-bit</p>
                                <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-400">
                                    <span onClick={() => navegar(`/${slugEscola}/privacidade`)} className="hover:text-white cursor-pointer transition-colors">Privacidade</span>
                                    <span className="opacity-20">•</span>
                                    <span onClick={() => navegar(`/${slugEscola}/suporte`)} className="hover:text-white cursor-pointer transition-colors">Suporte</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Versão Discreta */}
                <div className="absolute bottom-8 right-10 opacity-20 hover:opacity-100 transition-opacity">
                    <span
                        onClick={lidarComCliqueAdmin}
                        className="text-[9px] font-black text-white uppercase tracking-[0.4em] cursor-default select-none"
                    >
                        Catraki Operational Edge v4.5
                    </span>
                </div>
            </div>
        </div>
    );
}

