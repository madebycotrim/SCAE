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
        <div className="flex min-h-screen w-full font-sans overflow-hidden relative bg-white">
            {/* Efeito de Grade (Grid) — Visual Clean Tech */}
            <div 
                className="absolute inset-0 z-0 opacity-[0.035]"
                style={{
                    backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="flex-1 flex items-center justify-center p-5 md:p-10 relative z-10">
                {/* Card principal com Sombra Suave e Borda Fina */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-[1000px] rounded-[2rem] overflow-hidden flex flex-col md:flex-row min-h-[600px] bg-white border border-slate-200 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)]"
                >
                    {/* ─── PAINEL ESQUERDO (Apresentação) ─── */}
                    <div className="md:w-[45%] p-12 md:p-16 relative flex flex-col justify-between overflow-hidden bg-slate-50/50 border-r border-slate-100">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/10">
                                    <ShieldCheck className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
                                    Catraki<span className="text-blue-700 animate-pulse">.</span>
                                </span>
                            </div>

                            <div className="mt-16">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-100 shadow-sm mb-6">
                                    <Building2 className="w-3.5 h-3.5 text-blue-700" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{nomeEscola}</span>
                                </div>
                                <h2 className="text-4xl font-black text-slate-900 leading-[1.1] tracking-tight mb-6">
                                    Segurança<br />
                                    inteligente da<br />
                                    <span className="text-blue-700">borda à nuvem.</span>
                                </h2>
                                <p className="text-slate-500 text-sm leading-relaxed max-w-[18rem]">
                                    Gestão de acesso em tempo real com processamento local e sincronização imediata.
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 py-4 px-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm w-fit group hover:bg-white transition-all">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 group-hover:text-blue-600 transition-colors">
                                        <Fingerprint size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 group-hover:text-blue-600 transition-colors">
                                        <QrCode size={16} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Tecnologia</span>
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">Biometria & QR Code</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Marca d'água de grade no painel lateral */}
                        <div className="absolute top-1/2 right-0 w-64 h-64 bg-slate-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    </div>

                    {/* ─── PAINEL DIREITO (Login) ─── */}
                    <div className="flex-1 p-12 md:p-20 flex flex-col items-center justify-center bg-white relative">
                        <div className="w-full max-w-[320px]">
                            <div className="text-center mb-10">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Acesso Restrito</h3>
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Painel Administrativo</p>
                            </div>

                            {dominioEmail && (
                                <div className="flex justify-center mb-10">
                                    <div className="px-5 py-2.5 bg-blue-50 rounded-full flex items-center gap-2.5 border border-blue-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-700" />
                                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{dominioEmail}</span>
                                    </div>
                                </div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => handleLogin('user')}
                                disabled={carregando}
                                className="w-full flex items-center justify-center gap-4 py-4 px-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                {provedorAuth === 'microsoft' ? (
                                    <svg width="18" height="18" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                )}
                                <span>Entrar com {provedorAuth || 'Google'}</span>
                            </motion.button>

                            <AnimatePresence>
                                {erro && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase tracking-widest text-center"
                                    >
                                        {erro}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="mt-14 pt-8 border-t border-slate-50 text-center">
                                <div className="flex justify-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                    <span onClick={() => navegar(`/${slugEscola}/privacidade`)} className="hover:text-sky-600 cursor-pointer transition-colors">Privacidade</span>
                                    <span onClick={() => navegar(`/${slugEscola}/suporte`)} className="hover:text-sky-600 cursor-pointer transition-colors">Suporte</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Versão Discreta */}
                <div className="absolute bottom-8 right-10 opacity-30 hover:opacity-100 transition-opacity">
                    <span
                        onClick={lidarComCliqueAdmin}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] cursor-default select-none"
                    >
                        Catraki Operational Edge v4.5
                    </span>
                </div>
            </div>
        </div>
    );
}

