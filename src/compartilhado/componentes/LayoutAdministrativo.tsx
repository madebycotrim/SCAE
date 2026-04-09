// TODO: refatorar arquivo longo (> 300 linhas) para extrair lógica em hooks ou componentes menores, reduzindo a dívida técnica
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { usarPermissoes } from '../autorizacao/ContextoPermissoes';
import { usarNotificacoes, type Notificacao } from '@compartilhado/contextos/ContextoNotificacoes';
import { usarBuscaGlobal } from '@/compartilhado/hooks/usarBuscaGlobal';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarInstalacaoPWA } from '@/compartilhado/hooks/usarInstalacaoPWA';
import { mascararEmail } from '@/compartilhado/utils/formatar';


import {
    Activity,
    LayoutDashboard,
    Users,
    FileText,
    LogOut,
    Menu,
    Shield,
    Layers,
    Hexagon,
    Crown,
    RefreshCw,
    Search,
    Bell,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    Lock,
    X,
    Check,
    Clock,
    AlertTriangle,
    Info,
    CheckCircle,
    XCircle,
    Smartphone,
    Download,
    Calendar,
    Radar,
    Settings
} from 'lucide-react';
import { servicoSincronizacao } from '@/compartilhado/servicos/sincronizacao';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { BarraProgressoGlobal } from '@/compartilhado/componentes/UI';
import { ReactNode } from 'react';

const log = criarRegistrador('Layout');

interface LayoutAdministrativoProps {
    children: ReactNode;
    titulo: string;
    subtitulo?: string;
    acoes?: ReactNode | null;
    carregando?: boolean;
}

export default function LayoutAdministrativo({ children, titulo, subtitulo, acoes, carregando }: LayoutAdministrativoProps) {
    const { usuarioAtual, sair } = usarAutenticacao();
    const { ehAdmin, podeVerLogs, usuario, pode, ehCentral } = usarPermissoes();
    const navegar = useNavigate();
    const localizacao = useLocation();
    const { id: slugEscola, nomeEscola } = usarEscola();
    const { podeInstalar, instalarApp } = usarInstalacaoPWA();

    /** Prefixo base para todas as rotas admin desta escola */
    const prefixoAdmin = `/${slugEscola}/admin`;

    // Estado do Sidebar
    const [sidebarAberto, definirSidebarAberto] = useState(false); // Mobile
    const [sidebarMinimizado, definirSidebarMinimizado] = useState(() => {
        return localStorage.getItem('sidebarMinimizado') === 'true';
    });

    // Notificações
    const { notificacoes, naoLidas, marcarTodasComoLidas, marcarComoLida, removerNotificacao } = usarNotificacoes();
    const [notificacoesAberta, definirNotificacoesAberta] = useState(false);

    useEffect(() => {
        localStorage.setItem('sidebarMinimizado', String(sidebarMinimizado));
    }, [sidebarMinimizado]);

    // Busca Global
    const { termo, definirTermo, resultados } = usarBuscaGlobal();
    const [mostrarResultados, definirMostrarResultados] = useState(false);

    // Estados para preservação de UI
    const [animado, definirAnimado] = useState(false);
    const mainRef = useRef<HTMLElement>(null);
    const scrollPosicaoRef = useRef(0);

    // Animar entrada apenas uma vez por montagem do layout
    useEffect(() => {
        definirAnimado(true);
    }, []);

    // Preservar posição de scroll ao re-renderizar (carregando/atualizando dados)
    useLayoutEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = scrollPosicaoRef.current;
        }
    });

    const lidarComScroll = (e: React.UIEvent<HTMLElement>) => {
        scrollPosicaoRef.current = e.currentTarget.scrollTop;
    };

    // Resetar scroll ao mudar de página (navegação real)
    useEffect(() => {
        scrollPosicaoRef.current = 0;
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
    }, [localizacao.pathname]);

    // Fechar sidebar mobile ao navegar
    useEffect(() => {
        if (window.innerWidth < 1024) {
            definirSidebarAberto(false);
        }
    }, [localizacao, navegar]);

    // Status do Agente Local
    const [agenteOnline, definirAgenteOnline] = useState(false);
    const [agenteTemHardware, definirAgenteTemHardware] = useState(false);

    useEffect(() => {
        const checkAgente = async () => {
            try {
                const controlador = new AbortController();
                const timeoutId = setTimeout(() => controlador.abort(), 1500);
                
                const res = await fetch('http://127.0.0.1:1912/ping', { signal: controlador.signal });
                clearTimeout(timeoutId);
                
                if (res.ok) {
                    const dados = await res.json();
                    definirAgenteOnline(dados.ok === true);
                    definirAgenteTemHardware(dados.leitoresAtivos > 0);
                } else {
                    definirAgenteOnline(false);
                    definirAgenteTemHardware(false);
                }
            } catch (e) {
                definirAgenteOnline(false);
                definirAgenteTemHardware(false);
            }
        };

        checkAgente();
        const interval = setInterval(checkAgente, 2000);
        return () => clearInterval(interval);
    }, []);

    const gruposMenu = [
        {
            titulo: 'Visão Estratégica',
            itens: [
                { icone: LayoutDashboard, texto: 'Painel', rota: '/painel' },
            ]
        },
        {
            titulo: 'Acadêmico',
            itens: [
                { icone: Users, texto: 'Alunos', rota: '/alunos' },
                ...(pode('visualizar', 'turmas') ? [{ icone: Layers, texto: 'Turmas', rota: '/turmas' }] : []),
                ...(pode('visualizar', 'academico') ? [{ icone: Calendar, texto: 'Calendário', rota: '/calendario' }] : []),
            ]
        },
        {
            titulo: 'Operação',
            itens: [
                ...(pode('visualizar', 'configuracao-horarios') ? [{ icone: Clock, texto: 'Horários', rota: '/configuracao-horarios' }] : []),
                ...(pode('visualizar', 'risco_abandono') ? [{ icone: AlertTriangle, texto: 'Risco de Abandono', rota: '/risco-abandono' }] : []),
                ...(pode('visualizar', 'relatorios') ? [{ icone: FileText, texto: 'Relatórios', rota: '/relatorios' }] : []),
            ]
        },
        {
            titulo: 'Sistema',
            itens: [
                ...(pode('visualizar', 'usuarios') ? [{ icone: Shield, texto: 'Usuários', rota: '/usuarios' }] : []),
                ...(pode('visualizar', 'auditoria') ? [{ icone: Activity, texto: 'Logs', rota: '/logs' }] : []),
                ...(pode('visualizar', 'configuracoes') && agenteTemHardware ? [{ icone: Radar, texto: 'Agente', rota: '/agente' }] : []),
                ...(pode('visualizar', 'configuracoes') ? [{ icone: Settings, texto: 'Configurações', rota: '/configuracoes' }] : []),
            ]
        }
    ].filter(g => g.itens.length > 0);

    const aoSair = async () => {
        try {
            await sair();
            navegar(`/${slugEscola}/login`);
            toast.success('Você saiu do sistema');
        } catch (erro) {
            log.error('Erro ao sair', erro);
            toast.error('Erro ao realizar logout');
        }
    };

    const confirmarAcesso = async () => {
        if (!usuario) return;
        try {
            const banco = await import('@/compartilhado/servicos/bancoLocal').then(m => m.bancoLocal.iniciarBanco());
            const usuarioAtualizado = { ...usuario, pendente: false, ativo: true };
            await banco.put('usuarios', usuarioAtualizado);
            window.location.reload();
        } catch (e) {
            log.error('Erro ao confirmar acesso', e);
            toast.error('Erro ao confirmar acesso.');
        }
    };

    // Bloqueio para Usuários INATIVOS
    if (usuario && usuario.ativo === false) {
        return (
            <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-md max-w-md w-full p-8 text-center border border-slate-100">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-rose-50/50">
                        <Lock size={40} className="text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Conta Desativada</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Seu acesso ao sistema foi suspenso. Se você acredita que isso é um erro, entre em contato com a administração.
                    </p>

                    <button
                        onClick={aoSair}
                        className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-transparent transition-all"
                    >
                        Sair do Sistema
                    </button>
                </div>
            </div>
        );
    }

    if (usuario?.pendente) {
        return (
            <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-md max-w-md w-full p-8 text-center border border-slate-100">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-indigo-200">
                        <Crown size={40} className="text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Bem-vindo(a) ao Catraki!</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Você recebeu acesso de <span className="font-bold text-indigo-600">{usuario.papel}</span>.
                        Para continuar, confirme seus dados e aceite o convite para utilizar o sistema.
                    </p>

                    <button
                        onClick={confirmarAcesso}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-600/20"
                    >
                        Confirmar e Acessar
                    </button>

                    <button
                        onClick={aoSair}
                        className="w-full mt-4 py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                    >
                        Sair da conta
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden selection:bg-blue-100 selection:text-blue-900">
            <BarraProgressoGlobal ativa={!!carregando} />

            {/* Link de Pulo para Acessibilidade (WCAG 2.4.1) */}
            <a href="#conteudo-principal" className="pular-conteudo">
                Pular para o conteúdo principal
            </a>
            {/* Sobreposição Mobile */}
            {sidebarAberto && (
                <div
                    className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => definirSidebarAberto(false)}
                />
            )}

            {/* Barra Lateral (Acessibilidade: role navigation) */}
            <aside
                role="navigation"
                aria-label="Menu Principal"
                className={`
                    fixed lg:static inset-y-0 left-0 z-50
                    border-r border-slate-800/40
                    flex flex-col transition-all duration-300 ease-in-out shadow-none relative
                    ${sidebarAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${sidebarMinimizado ? 'lg:w-20' : 'lg:w-64'}
                    w-64 bg-slate-950
                `}
            >
                {/* Seção do Logo (Clean) */}
                <div className={`
                    h-14 flex items-center relative z-10 border-b border-slate-900
                    ${sidebarMinimizado ? 'justify-center px-0' : 'justify-between px-6'}
                `}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="shrink-0 flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-orange-500" strokeWidth={2.5} />
                        </div>

                        {!sidebarMinimizado && (
                            <div className="flex flex-col">
                                <h1 className="font-black text-white leading-tight uppercase tracking-widest">
                                    CATRAKI
                                </h1>
                                <p className="text-[12px] text-slate-400 font-bold truncate max-w-[160px] uppercase tracking-tighter">{nomeEscola}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => definirSidebarMinimizado(!sidebarMinimizado)}
                        aria-label={sidebarMinimizado ? "Expandir menu" : "Recolher menu"}
                        className={`
                            absolute -right-3 top-1/2 -translate-y-1/2 
                            w-6 h-6 bg-slate-950 border border-slate-800 rounded-full 
                            flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800
                            z-50 hidden lg:flex transition-colors
                        `}
                    >
                        {sidebarMinimizado ? <ChevronRight size={12} aria-hidden="true" /> : <ChevronLeft size={12} aria-hidden="true" />}
                    </button>
                </div>

                {/* Navegação */}
                <nav className={`
                    flex-1 overflow-y-auto overflow-x-hidden py-4 z-10
                    scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent
                    ${sidebarMinimizado ? 'px-3' : 'px-4'}
                `} aria-label="Atalhos do sistema">
                    <div className="mb-4">
                        <div className="space-y-4">
                            {gruposMenu.map((grupo, idx) => (
                                <div key={idx} className="space-y-1">
                                    {!sidebarMinimizado && (
                                        <p className="pl-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 mt-6 first:mt-0 leading-none">
                                            {grupo.titulo}
                                        </p>
                                    )}
                                    <div className="space-y-0.5">
                                        {grupo.itens.map((item) => {
                                            const Icone = item.icone;
                                            const ativo = localizacao.pathname.startsWith(`${prefixoAdmin}${item.rota}`);

                                            return (
                                                <button
                                                    key={item.rota}
                                                    onClick={() => navegar(`${prefixoAdmin}${item.rota}`)}
                                                    className={`
                                                        w-full flex items-center transition-all duration-150 group
                                                        ${sidebarMinimizado ? 'justify-center p-2' : 'gap-3 px-3 py-2'}
                                                        ${ativo
                                                            ? 'bg-orange-500/10 border-l-2 border-orange-500 text-white font-black rounded-r-2xl'
                                                            : 'bg-transparent text-slate-400 font-bold hover:bg-slate-900/50 hover:text-slate-200 rounded-2xl'
                                                        }
                                                    `}
                                                    title={sidebarMinimizado ? item.texto : ""}
                                                >
                                                    <Icone
                                                        size={16}
                                                        className={ativo ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-300 transition-colors'}
                                                    />
                                                    {!sidebarMinimizado && (
                                                        <span className="text-sm">{item.texto}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </nav>

                {/* Perfil */}
                <div className="p-4 border-t border-[rgba(255,255,255,0.06)] z-10">
                    <div className={`flex items-center ${sidebarMinimizado ? 'justify-center flex-col gap-4' : 'justify-between px-1'}`}>
                        <div className={`flex items-center ${sidebarMinimizado ? 'flex-col gap-4' : 'gap-3 min-w-0'}`}>
                            <div className="relative shrink-0">
                                <div className="w-9 h-9 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner overflow-hidden">
                                    {usuarioAtual?.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
                            </div>
                            {!sidebarMinimizado && (
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-[12px] font-black text-white truncate uppercase tracking-tight">
                                        {usuario?.nome_completo || 'Usuário'}
                                    </p>
                                    <p className="text-[10.5px] text-slate-400 truncate font-bold tracking-tighter">
                                        {mascararEmail(usuarioAtual?.email)}
                                    </p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={aoSair}
                            className="group p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all"
                            title="Sair"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Area de Conteúdo */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                <header
                    role="banner"
                    className="bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-8"
                    style={{ height: '64px' }}
                >
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => definirSidebarAberto(!sidebarAberto)}
                            aria-label="Abrir menu de navegação"
                            className="lg:hidden p-2 -ml-1 text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors"
                        >
                            <Menu size={18} aria-hidden="true" />
                        </button>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-lg font-black text-slate-900 leading-none tracking-tight uppercase">{titulo}</h1>
                            {subtitulo && <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 hidden sm:block">{subtitulo}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        {/* Busca */}
                        <div className="hidden md:flex items-center relative group h-8">
                            <label htmlFor="input-busca-global" className="sr-only">Pesquisar no sistema</label>
                            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" aria-hidden="true" />
                            <input
                                id="input-busca-global"
                                type="text"
                                placeholder="Buscar no sistema... (Ctrl+K)"
                                value={termo}
                                onChange={(e) => {
                                    definirTermo(e.target.value);
                                    definirMostrarResultados(true);
                                }}
                                onFocus={() => definirMostrarResultados(true)}
                                className="pl-9 pr-12 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 rounded-2xl text-[11px] font-bold w-64 focus:w-80 h-full outline-none transition-all duration-300"
                                aria-autocomplete="list"
                            />

                            {mostrarResultados && resultados.length > 0 && !localizacao.pathname.includes('/logs') && (
                                <>
                                    <div className="fixed inset-0 z-[45]" onClick={() => definirMostrarResultados(false)} />
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-md border border-slate-200 z-[50] overflow-hidden origin-top animate-in fade-in zoom-in-95 duration-200">
                                        <div className="max-h-[320px] overflow-y-auto p-1.5 flex flex-col gap-1">
                                            {resultados.map((res) => {
                                                const Icone = res.icone;
                                                return (
                                                    <button
                                                        key={res.id}
                                                        onClick={() => {
                                                            navegar(`${prefixoAdmin}${res.rota}`);
                                                            definirTermo('');
                                                            definirMostrarResultados(false);
                                                        }}
                                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all text-left group"
                                                    >
                                                        <div className="w-9 h-9 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                            <Icone size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{res.titulo}</p>
                                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{res.descricao}</p>
                                                        </div>
                                                        <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Notificações Premium */}
                        <div className="relative">
                            <button
                                onClick={() => definirNotificacoesAberta(!notificacoesAberta)}
                                aria-label={`Notificações ${naoLidas > 0 ? `(${naoLidas} não lidas)` : ''}`}
                                className={`
                                    relative p-2 rounded-2xl transition-all duration-200
                                    ${notificacoesAberta ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
                                `}
                            >
                                <Bell size={18} strokeWidth={2.5} aria-hidden="true" />
                                {naoLidas > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-fade-in shadow-sm">
                                        <span className="sr-only">{naoLidas} não lidas</span>
                                        <span aria-hidden="true">{naoLidas > 9 ? '9+' : naoLidas}</span>
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {notificacoesAberta && (
                                    <>
                                        <div className="fixed inset-0 z-[45]" onClick={() => definirNotificacoesAberta(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full right-0 mt-3 w-80 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 z-[50] overflow-hidden origin-top-right"
                                        >
                                            <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Notificações</h4>
                                                {naoLidas > 0 && (
                                                    <button
                                                        onClick={() => marcarTodasComoLidas()}
                                                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-tighter"
                                                    >
                                                        Marcar como lidas
                                                    </button>
                                                )}
                                            </div>

                                            <div className="max-h-[380px] overflow-y-auto p-2 custom-scrollbar flex flex-col gap-1">
                                                {notificacoes.length === 0 ? (
                                                    <div className="py-12 text-center">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                            <Bell size={20} className="text-slate-300" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nada por aqui</p>
                                                    </div>
                                                ) : (
                                                    notificacoes.map((n: Notificacao) => (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => marcarComoLida(n.id)}
                                                            className={`
                                                                relative p-3 rounded-2xl transition-all group/notif cursor-pointer
                                                                ${n.lida ? 'opacity-60 hover:opacity-100' : 'bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm'}
                                                            `}
                                                        >
                                                            {!n.lida && (
                                                                <div className="absolute left-2 top-4 w-1 h-1 bg-indigo-600 rounded-full" />
                                                            )}
                                                            <div className="pl-3">
                                                                <div className="flex justify-between items-start mb-0.5">
                                                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">{n.titulo}</p>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            removerNotificacao(n.id);
                                                                        }}
                                                                        className="opacity-0 group-hover/notif:opacity-100 p-1 hover:bg-slate-100 rounded-md transition-all"
                                                                    >
                                                                        <X size={10} className="text-slate-400" />
                                                                    </button>
                                                                </div>
                                                                <p className="text-[9px] font-bold text-slate-400 line-clamp-2 leading-relaxed mb-1 uppercase tracking-tighter">{n.mensagem}</p>
                                                                <p className="text-[8px] font-black text-slate-300 uppercase">{new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {notificacoes.length > 0 && (
                                                <div className="p-3 bg-slate-50/50 border-t border-slate-50">
                                                    <button className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors">
                                                        Ver Histórico Completo
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {acoes && (
                            <div className="flex items-center gap-5 h-8">
                                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                                <div className="flex items-center gap-3 h-full">{acoes}</div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Conteúdo (Acessibilidade: main landmark) */}
                <main
                    id="conteudo-principal"
                    role="main"
                    tabIndex={-1}
                    ref={mainRef}
                    onScroll={lidarComScroll}
                    className="flex-1 overflow-y-auto p-8 md:p-10 lg:p-12 scroll-smooth z-10 custom-scrollbar bg-slate-50/30"
                >
                    <motion.div
                        key={localizacao.pathname}
                        initial={!animado ? { opacity: 0, y: 20 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="max-w-[1600px] mx-auto"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
