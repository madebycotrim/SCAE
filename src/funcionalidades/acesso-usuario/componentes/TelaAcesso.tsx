import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { usarEscola } from '@escola/ProvedorEscola';
import { ShieldCheck, Lock, QrCode, ScanLine, Fingerprint, Check, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Login');

export default function TelaAcesso() {
    const { entrar, sair } = usarAutenticacao();
    const navegar = useNavigate();
    const { slugEscola } = useParams();
    const { nomeEscola, dominioEmail } = usarEscola();

    const [erro, definirErro] = useState('');
    const [carregando, definirCarregando] = useState(false);

    const handleGoogleLogin = async (tipo: 'admin' | 'user') => {
        definirCarregando(true);
        definirErro('');

        try {
            const params = (dominioEmail && tipo !== 'admin') ? { hd: dominioEmail } : {};
            const resultado = await entrar(params) as { user: { email: string } };
            const usuario = resultado.user;
            const email = usuario.email;

            if (tipo === 'admin') {
                if (email.trim().toLowerCase() !== 'madebycotrim@gmail.com') {
                    await sair();
                    throw new Error('ACESSO NEGADO: Este botão é de uso exclusivo do administrador do sistema (madebycotrim).');
                }
            } else if (dominioEmail && !email.endsWith(dominioEmail)) {
                await sair();
                throw new Error(`ACESSO NEGADO: Apenas emails institucionais (@${dominioEmail}) são permitidos para esta escola.`);
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
            className="flex min-h-screen w-full font-sans overflow-hidden bg-slate-50"
            style={{
                backgroundImage: 'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}
        >
            <div className="flex-1 flex items-center justify-center p-5 md:p-10">

                {/* Card principal */}
                <div
                    className="w-full max-w-[1000px] rounded-2xl overflow-hidden flex flex-col md:flex-row min-h-[560px]"
                    style={{ boxShadow: '0 32px 64px rgba(6,13,31,0.18), 0 0 0 1px rgba(15,23,42,0.06)' }}
                >

                    {/* ─── PAINEL ESQUERDO ─── */}
                    <div
                        className="md:w-[52%] p-14 relative flex flex-col justify-between overflow-hidden"
                        style={{ background: 'linear-gradient(145deg, #060d1f 0%, #0a1628 60%, #0d1f3c 100%)' }}
                    >
                        {/* Padrão decorativo — branco muito sutil */}
                        <div className="absolute top-[10%] right-[8%] opacity-[0.05]">
                            <QrCode className="w-28 h-28 text-white" strokeWidth={1} />
                        </div>
                        <div className="absolute bottom-[12%] right-[5%] opacity-[0.04] rotate-12">
                            <ScanLine className="w-20 h-20 text-white" strokeWidth={1} />
                        </div>
                        <div className="absolute top-[48%] right-[25%] opacity-[0.03] -rotate-6">
                            <Fingerprint className="w-16 h-16 text-white" strokeWidth={1} />
                        </div>

                        {/* Blur de fundo sutil */}
                        <div className="absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-1/3 translate-x-1/3 blur-[90px] bg-white/[0.04]"></div>

                        {/* BLOCO 1 — Logo SCAE (topo esquerdo) */}
                        <div className="relative z-10 flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-white/[0.08] border border-white/[0.12]">
                                <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white tracking-tight">SCAE<span className="text-sky-400">.</span></span>
                        </div>

                        {/* BLOCO 2, 3, 4 — Conteúdo central */}
                        <div className="relative z-10 space-y-7 my-auto">

                            {/* BLOCO 2 — Nome da escola em pill */}
                            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.08] border border-white/[0.15]">
                                <Building2 className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-200 uppercase tracking-[0.15em]">{nomeEscola}</span>
                            </div>

                            {/* BLOCO 3 — Frase de impacto */}
                            <div>
                                <h2 className="text-[2rem] md:text-[2.1rem] font-black text-white leading-[1.15] tracking-tight">
                                    Segurança e controle<br />
                                    para cada entrada.
                                </h2>
                                <p className="text-slate-400 text-[15px] leading-relaxed mt-3 max-w-[20rem]">
                                    Da porta ao celular dos pais — em segundos.
                                </p>
                            </div>

                            {/* BLOCO 4 — Bullet points de valor */}
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                                    <span className="text-[13px] text-slate-300">Registros de acesso em tempo real</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                                    <span className="text-[13px] text-slate-300">Portal exclusivo para responsáveis</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                                    <span className="text-[13px] text-slate-300">Conformidade total com a LGPD</span>
                                </div>
                            </div>
                        </div>

                        {/* BLOCO 5 — Badge Acesso Restrito (rodapé) */}
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12]">
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acesso Restrito</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── PAINEL DIREITO ─── */}
                    <div className="md:w-[48%] p-14 flex flex-col items-center justify-center bg-white relative">

                        <div className="max-w-[280px] w-full">

                            {/* Ícone + Títulos */}
                            <div className="text-center mb-8">
                                <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center mx-auto mb-4 bg-slate-100 border border-slate-200">
                                    <ShieldCheck className="w-6 h-6 text-slate-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Painel Administrativo</h3>
                                <p className="text-slate-500 text-sm font-medium mt-1.5 leading-relaxed">
                                    Entre com seu e-mail institucional<br />para acessar o painel
                                </p>
                            </div>

                            {/* Botão Google OAuth */}
                            <button
                                onClick={() => handleGoogleLogin('user')}
                                disabled={carregando}
                                className="w-full flex items-center justify-center gap-3 py-3 px-5 bg-white border-[1.5px] border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all duration-150 group shadow-sm hover:shadow-md active:scale-[0.98]"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-105 transition-transform duration-150 flex-shrink-0">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span className="text-[14px]">Entrar com e-mail institucional</span>
                            </button>

                            {/* Feedback de erro */}
                            {erro && (
                                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0"></div>
                                    <span>{erro}</span>
                                </div>
                            )}

                            {/* Domínio institucional */}
                            <p className="mt-6 text-center text-sm text-slate-400 font-medium leading-relaxed">
                                Utilize seu e-mail institucional {dominioEmail && (
                                    <>da escola: <br /><strong className="text-slate-800 font-semibold break-all">{dominioEmail.startsWith('@') ? dominioEmail : `@${dominioEmail}`}</strong></>
                                )}
                            </p>

                            {/* Separador */}
                            <div className="mt-6 border-t border-slate-100"></div>

                            {/* Termos e Privacidade */}
                            <div className="mt-5 text-center text-[11px] text-slate-400 leading-relaxed">
                                Ao continuar, você concorda com nossos{' '}
                                <span onClick={() => navegar(`/${slugEscola}/termos-de-uso`)} className="text-slate-500 underline hover:text-slate-800 transition-colors cursor-pointer">Termos de Uso</span>
                                {' '}e{' '}
                                <span onClick={() => navegar(`/${slugEscola}/politica-de-privacidade`)} className="text-slate-500 underline hover:text-slate-800 transition-colors cursor-pointer">Política de Privacidade</span>.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assinatura — canto inferior direito */}
                <div className="absolute bottom-3 right-5 z-20">
                    <button
                        onClick={() => handleGoogleLogin('admin')}
                        className="text-[9px] font-medium text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em] px-3 py-1.5 rounded-full hover:bg-slate-100 opacity-40 hover:opacity-100"
                        title="Acesso Administrativo"
                    >
                        madebycotrim
                    </button>
                </div>
            </div>
        </div>
    );
}
