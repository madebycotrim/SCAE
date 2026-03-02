import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { usarTenant } from '@tenant/provedorTenant';
import { ShieldCheck, Chrome, GraduationCap, BookOpen, School } from 'lucide-react';
import toast from 'react-hot-toast';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { EMAIL_ADMIN_RAIZ, DOMINIO_INSTITUCIONAL } from '@compartilhado/constantes/configuracao';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Login');

export default function Login() {
    const { entrar, sair } = usarAutenticacao();
    const navegar = useNavigate();
    const { slugEscola } = useParams();
    const { nomeEscola, dominioEmail } = usarTenant();

    const [erro, definirErro] = useState('');
    const [carregando, definirCarregando] = useState(false);

    const handleGoogleLogin = async (tipo: 'admin' | 'user') => {
        definirCarregando(true);
        definirErro('');

        try {
            // 1. Iniciar Login com Google
            // Para admin: sugere o email específico. Para usuários: restringe ao domínio institucional.
            const params = tipo === 'admin'
                ? { login_hint: EMAIL_ADMIN_RAIZ }
                : { hd: dominioEmail || 'edu.se.df.gov.br' };

            const resultado = await entrar(params) as { user: { email: string } };
            const usuario = resultado.user;
            const email = usuario.email;

            // 2. Validação de Segurança
            if (tipo === 'admin') {
                if (email !== EMAIL_ADMIN_RAIZ) {
                    await sair();
                    throw new Error('ACESSO NEGADO: Este email não tem permissão de administrador.');
                }
                toast.success('Bem-vindo, Administrador!');
            } else {
                // Permite APENAS o domínio da escola (Email Institucional Exclusivo)
                const dominioObrigatorio = dominioEmail || DOMINIO_INSTITUCIONAL;
                const dominioValido = email.endsWith(dominioObrigatorio);

                if (!dominioValido) {
                    await sair();
                    throw new Error(`ACESSO NEGADO: Apenas emails institucionais (@${dominioObrigatorio}) são permitidos.`);
                }
                toast.success('Login realizado com sucesso!');
            }

            // Log de Auditoria
            await Registrador.registrar('LOGIN_SUCESSO', 'sistema', 'auth', {
                email: email,
                tipo_login: tipo
            });

            // 3. Redirecionamento
            navegar(`/${slugEscola}/admin/painel`);

        } catch (error) {
            log.error('Erro no login', error);
            // Tratamento de erros do Firebase ou Validação
            let mensagem = error.message;
            if (error?.code === 'auth/popup-closed-by-user') mensagem = 'Login cancelado pelo usuário.';
            if (error?.code === 'auth/network-request-failed') mensagem = 'Erro de conexão. Verifique sua internet.';

            definirErro(mensagem);
            toast.error(mensagem);
            await sair(); // Garante logout em caso de erro pós-auth
        } finally {
            definirCarregando(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 to-indigo-50/30 font-sans overflow-hidden">
            {/* Badge Escola Top Right - Minimalista */}
            <div className="absolute top-8 right-8 z-50 flex items-center gap-3 animate-fade-in group cursor-default">
                <div className="text-right hidden sm:block">
                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-tight">SCAE</p>
                    <p className="text-sm font-black text-slate-700 uppercase tracking-tight leading-tight">{nomeEscola}</p>
                </div>
            </div>

            {/* Container Centralizado */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">

                {/* Background Pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                </div>

                <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(79,70,229,0.2)] ring-1 ring-slate-200/50 z-10 animate-slide-up overflow-hidden flex flex-col md:flex-row min-h-[600px] transition-shadow duration-500 hover:shadow-[0_25px_65px_-15px_rgba(79,70,229,0.25)]">

                    {/* Lateral Esquerda - Identidade Visual */}
                    <div className="md:w-1/2 p-10 md:p-14 bg-[#0f172a] relative flex flex-col justify-between overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full translate-y-1/4 -translate-x-1/4 blur-2xl"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 backdrop-blur-sm">
                                    <ShieldCheck className="text-indigo-400 w-6 h-6" />
                                </div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">SCAE<span className="text-indigo-400">.</span></h1>
                            </div>
                        </div>

                        <div className="relative z-10 space-y-6">
                            <h2 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight">
                                Gestão Escolar <br />
                                <span className="text-indigo-400">Inteligente</span>
                            </h2>
                            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
                                Conectando segurança, controle de acesso e frequência em uma única plataforma unificada.
                            </p>

                            <div className="flex items-center gap-2 pt-4">
                                <span className="w-12 h-1 bg-indigo-500 rounded-full"></span>
                                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Acesso Restrito</span>
                            </div>
                        </div>

                        <div className="relative z-10 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-12 md:mt-0">
                            <BookOpen size={14} className="text-indigo-500/50" />
                            Sistema de Controle de Acesso Escolar
                        </div>
                    </div>

                    {/* Lateral Direita - Login */}
                    <div className="md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white relative">

                        <div className="max-w-xs mx-auto w-full">
                            <div className="text-center mb-10">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-100 rotate-3 transition-transform hover:rotate-6 shadow-sm">
                                    <GraduationCap className="text-slate-700 w-8 h-8" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Bem-vindo</h3>
                                <p className="text-slate-500 text-sm font-medium">Identifique-se para continuar</p>
                            </div>

                            <button
                                onClick={() => handleGoogleLogin('user')}
                                disabled={carregando}
                                className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-105 transition-transform duration-300">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span>Entrar com e-mail institucional</span>
                            </button>

                            <p className="mt-6 text-center text-[13px] text-slate-500 font-medium">
                                Utilize seu e-mail <br /><strong className="text-slate-700 break-all">@{dominioEmail || 'edu.se.df.gov.br'}</strong>
                            </p>

                            <div className="mt-8 text-center text-[11px] text-slate-400">
                                Ao continuar, você concorda com nossos{' '}
                                <span onClick={() => navegar(`/${slugEscola}/termos`)} className="font-semibold text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer">Termos de Uso</span>
                                {' '}e{' '}
                                <span onClick={() => navegar(`/${slugEscola}/privacidade`)} className="font-semibold text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer">Política de Privacidade</span>.
                            </div>

                            {erro && (
                                <div className="mt-6 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-lg text-center animate-shake flex items-center justify-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                                    <span>{erro}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Minimalista */}
                <div className="absolute bottom-6 left-0 w-full flex justify-center z-20">
                    <button
                        onClick={() => handleGoogleLogin('admin')}
                        className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-[0.2em] px-4 py-2 rounded-full hover:bg-slate-200/50"
                        title="Acesso Administrativo"
                    >
                        madebycotrim
                    </button>
                </div>
            </div>
        </div>
    );
}
