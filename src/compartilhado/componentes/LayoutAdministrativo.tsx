// TODO: refatorar arquivo longo (> 300 linhas) para extrair lógica em hooks ou componentes menores, reduzindo a dívida técnica
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { usarPermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';
import { usarNotificacoes } from '@compartilhado/contextos/ContextoNotificacoes';
import { usarBuscaGlobal } from '@compartilhado/hooks/usarBuscaGlobal';
import { usarEscola } from '@escola/ProvedorEscola';
import {
    LayoutDashboard,
    Users,
    FileText,
    LogOut,
    Menu,
    Shield,
    Layers,
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
    XCircle
} from 'lucide-react';
import { servicoSincronizacao } from '@compartilhado/servicos/sincronizacao';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Layout');



import { ReactNode } from 'react';

interface LayoutAdministrativoProps {
    children: ReactNode;
    titulo: string;
    subtitulo?: string;
    acoes?: ReactNode | null;
}

export default function LayoutAdministrativo({ children, titulo, subtitulo, acoes }: LayoutAdministrativoProps) {
    const { usuarioAtual, sair } = usarAutenticacao();
    const { ehAdmin, podeVerLogs, usuario, pode, ehCentral } = usarPermissoes();
    const navegar = useNavigate();
    const localizacao = useLocation();
    const { id: slugEscola, nomeEscola } = usarEscola();

    /** Prefixo base para todas as rotas admin desta escola */
    const prefixoAdmin = `/${slugEscola}/admin`;

    // Estado do Sidebar
    const [sidebarAberto, definirSidebarAberto] = useState(true); // Mobile
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

    // Atalhos de Teclado
    useEffect(() => {
        const tratarTeclas = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('input-busca-global')?.focus();
            }
            if (e.key === 'Escape') {
                definirMostrarResultados(false);
            }
        };

        window.addEventListener('keydown', tratarTeclas);
        return () => window.removeEventListener('keydown', tratarTeclas);
    }, []);

    // Fechar sidebar mobile ao navegar
    useEffect(() => {
        if (window.innerWidth < 1024) {
            definirSidebarAberto(false);
        }
    }, [localizacao, navegar]);

    // Agrupamento lógico dos itens
    const gruposMenu = [
        {
            titulo: 'Visão',
            itens: [
                { icone: LayoutDashboard, texto: 'Painel', rota: '/painel' }
            ]
        },
        {
            titulo: 'Pedagógico',
            itens: [
                { icone: Users, texto: 'Alunos', rota: '/alunos' },
                { icone: Layers, texto: 'Turmas', rota: '/turmas' },
            ]
        },
        {
            titulo: 'Controle',
            itens: [
                { icone: Clock, texto: 'Acessos', rota: '/configuracao-horarios' },
                { icone: AlertTriangle, texto: 'Risco de Abandono', rota: '/risco-abandono' },
                { icone: FileText, texto: 'Relatórios', rota: '/relatorios' },
            ]
        }
    ];

    // Itens de administração por permissão
    const itensMenuLogs = podeVerLogs
        ? [{ icone: FileText, texto: 'Logs de Auditoria', rota: '/logs' }]
        : [];

    const itensMenuAdmin = (ehAdmin || ehCentral)
        ? [{ icone: Shield, texto: 'Usuários do Sistema', rota: '/usuarios' }]
        : [];

    const itensMenuAdministracao = [...itensMenuLogs, ...itensMenuAdmin];


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
            const banco = await import('@compartilhado/servicos/bancoLocal').then(m => m.bancoLocal.iniciarBanco());
            const usuarioAtualizado = { ...usuario, pendente: false, ativo: true };
            await banco.put('usuarios', usuarioAtualizado);
            // Force reload logic or context update could be better, but a reload is safe for ensuring state
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
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-100">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-rose-50/50">
                        <Lock size={40} className="text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Conta Desativada</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Seu acesso ao sistema foi suspenso. Se você acredita que isso é um erro, entre em contato com a administração.
                    </p>

                    <button
                        onClick={aoSair}
                        className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-transparent transition-all"
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
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-100">
                    <div className="w-20 h-20 bg-escola-claro rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-escola">
                        <Crown size={40} className="text-escola" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Bem-vindo(a) ao SCAE!</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Você recebeu acesso de <span className="font-bold text-escola">{usuario.papel}</span>.
                        Para continuar, confirme seus dados e aceite o convite para utilizar o sistema.
                    </p>

                    <button
                        onClick={confirmarAcesso}
                        className="w-full py-4 bg-escola text-white rounded-xl font-bold text-lg bg-escola-hover hover:scale-[1.02] active:scale-95 transition-all shadow-escola"
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
            {/* Sobreposição Mobile */}
            {sidebarAberto && (
                <div
                    className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => definirSidebarAberto(false)}
                />
            )}

            {/* Barra Lateral */}
            <aside
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
                            <ShieldCheck className="w-6 h-6 text-sky-400" strokeWidth={2.5} />
                        </div>

                        {!sidebarMinimizado && (
                            <div className="flex flex-col">
                                <h1 className="font-black text-white leading-tight uppercase tracking-widest">
                                    SCAE
                                </h1>
                                <p className="text-[12px] text-slate-500 font-bold truncate max-w-[160px] uppercase tracking-tighter">{nomeEscola}</p>
                            </div>
                        )}
                    </div>

                    {/* Botão de Alternância (Discreto) */}
                    <button
                        onClick={() => definirSidebarMinimizado(!sidebarMinimizado)}
                        className={`
                            absolute -right-3 top-1/2 -translate-y-1/2 
                            w-6 h-6 bg-slate-950 border border-slate-800 rounded-full 
                            flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800
                            z-50 hidden lg:flex transition-colors
                        `}
                    >
                        {sidebarMinimizado ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                    </button>
                </div>

                {/* Navegação */}
                <nav className={`
                    flex-1 overflow-y-auto overflow-x-hidden py-4 z-10
                    scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent
                    ${sidebarMinimizado ? 'px-3' : 'px-4'}
                `}>
                    {/* Menu Principal */}
                    <div className="mb-4">
                        <div className="space-y-4">
                            {gruposMenu.map((grupo, idx) => (
                                <div key={idx} className="space-y-1">
                                    {!sidebarMinimizado && (
                                        <p className="pl-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 mt-6 first:mt-0 leading-none">
                                            {grupo.titulo}
                                        </p>
                                    )}
                                    <div className="space-y-0.5">
                                        {grupo.itens.map((item) => {
                                            const Icone = item.icone;
                                            const ativo = localizacao.pathname.startsWith(`${prefixoAdmin}${item.rota}`);

                                            return (
                                                <div key={item.rota} className="space-y-0.5">
                                                    <button
                                                        onClick={() => navegar(`${prefixoAdmin}${item.rota}`)}
                                                        className={`
                                                            w-full flex items-center transition-all duration-150 group
                                                            ${sidebarMinimizado ? 'justify-center p-2' : 'gap-3 px-3 py-2'}
                                                            ${ativo
                                                                ? 'bg-sky-500/10 border-l-2 border-sky-400 text-white font-black rounded-r-lg'
                                                                : 'bg-transparent text-slate-400 font-bold hover:bg-slate-900/50 hover:text-slate-200 rounded-lg'
                                                            }
                                                        `}
                                                        title={sidebarMinimizado ? item.texto : ""}
                                                    >
                                                        <Icone
                                                            size={16}
                                                            className={ativo ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300 transition-colors'}
                                                        />

                                                        {!sidebarMinimizado && (
                                                            <span className="text-sm">
                                                                {item.texto}
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Seção Administrativa */}
                    {itensMenuAdministracao.length > 0 && (
                        <div>
                            {!sidebarMinimizado && (
                                <div className="mt-6 mb-2">
                                    <p className="pl-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-3">
                                        Administração
                                    </p>
                                </div>
                            )}

                            <div className="space-y-0.5">
                                {itensMenuAdministracao.map((item) => {
                                    const Icone = item.icone;
                                    const ativo = localizacao.pathname.startsWith(`${prefixoAdmin}${item.rota}`);

                                    return (
                                        <button
                                            key={item.rota}
                                            onClick={() => navegar(`${prefixoAdmin}${item.rota}`)}
                                            className={`
                                                w-full flex items-center transition-all duration-150 group
                                                ${sidebarMinimizado ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
                                                ${ativo
                                                    ? 'bg-sky-500/10 border-l-2 border-sky-400 text-white font-black rounded-r-lg'
                                                    : 'bg-transparent text-slate-400 font-bold hover:bg-slate-900/50 hover:text-slate-200 rounded-lg'
                                                }
                                            `}
                                            title={sidebarMinimizado ? item.texto : ""}
                                        >
                                            <Icone
                                                size={16}
                                                className={ativo ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300 transition-colors'}
                                            />
                                            {!sidebarMinimizado && (
                                                <span className="text-sm">
                                                    {item.texto}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </nav>

                {/* Rodapé - Perfil do Usuário */}
                <div className="p-4 border-t border-[rgba(255,255,255,0.06)] z-10">
                    <div className={`flex items-center ${sidebarMinimizado ? 'justify-center flex-col gap-4' : 'justify-between px-1'}`}>

                        {/* Avatar e Infos */}
                        <div className={`flex items-center ${sidebarMinimizado ? 'flex-col gap-4' : 'gap-3 min-w-0'}`}>
                            <div className="relative shrink-0 cursor-pointer">
                                <div className="w-9 h-9 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner group-hover:border-slate-700 transition-colors">
                                    {usuarioAtual?.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
                            </div>

                            {!sidebarMinimizado && (
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-[12px] font-black text-white truncate uppercase tracking-tight">
                                        {usuarioAtual?.email?.split('@')[0] || 'Usuário'}
                                    </p>
                                    <p className="text-[10.5px] text-slate-500 truncate font-bold tracking-tighter" title={usuarioAtual?.email}>
                                        {usuarioAtual?.email}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Botão Sair */}
                        <button
                            onClick={aoSair}
                            className={`
                                flex items-center justify-center shrink-0 transition-all duration-150 group rounded-lg
                                ${sidebarMinimizado ? 'w-9 h-9 hover:bg-[rgba(239,68,68,0.08)]' : 'w-8 h-8 hover:bg-[rgba(239,68,68,0.08)]'}
                            `}
                            title="Sair"
                        >
                            <LogOut size={16} className="text-slate-400 group-hover:text-red-400 transition-colors" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Area de Conteúdo Principal */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50 relative overflow-hidden">

                {/* Cabeçalho */}
                <header
                    className="bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-8"
                    style={{ height: '64px' }}
                >
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => definirSidebarAberto(!sidebarAberto)}
                            className="lg:hidden p-2 -ml-1 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <Menu size={18} />
                        </button>

                        <div className="flex flex-col justify-center">
                            <h1 className="text-lg font-black text-slate-900 leading-none tracking-tight uppercase">{titulo}</h1>
                            {subtitulo && <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 hidden sm:block">{subtitulo}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        {/* Barra de Busca - Oculta em telas pequenas */}
                        <div className="hidden md:flex items-center relative group h-8">
                            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" />
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
                                className="pl-9 pr-12 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 rounded-lg text-[11px] font-bold w-64 focus:w-80 h-full outline-none transition-all duration-300"
                            />

                            {/* Resultados da Busca */}
                            {mostrarResultados && resultados.length > 0 && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[45]"
                                        onClick={() => definirMostrarResultados(false)}
                                    />
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-[50] overflow-hidden origin-top animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1">Funcionalidades Sugeridas</p>
                                        </div>
                                        <div className="max-h-[320px] overflow-y-auto p-1.5 flex flex-col gap-1">
                                            {resultados.map((res) => {
                                                const Icone = res.icone;
                                                const corCategoria =
                                                    res.categoria === 'acao' ? 'bg-amber-100 text-amber-600' :
                                                        res.categoria === 'dado' ? 'bg-indigo-100 text-indigo-600' :
                                                            'bg-slate-100 text-slate-500';

                                                const labelCategoria =
                                                    res.categoria === 'acao' ? 'Ação' :
                                                        res.categoria === 'dado' ? 'Consulta' :
                                                            'Página';

                                                return (
                                                    <button
                                                        key={res.id}
                                                        onClick={() => {
                                                            navegar(`${prefixoAdmin}${res.rota}`);
                                                            definirTermo('');
                                                            definirMostrarResultados(false);
                                                        }}
                                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-all text-left group"
                                                    >
                                                        <div className={`w-9 h-9 ${corCategoria} rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors`}>
                                                            <Icone size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{res.titulo}</p>
                                                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border transition-colors ${res.categoria === 'acao' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                    res.categoria === 'dado' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                        'bg-slate-50 text-slate-400 border-slate-100 group-hover:text-blue-600 group-hover:border-blue-200'
                                                                    }`}>
                                                                    {labelCategoria}
                                                                </span>
                                                            </div>
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

                        <div className="h-6 w-px bg-slate-200"></div>

                        {/* Notificações */}
                        <div className="relative flex items-center">
                            <button
                                onClick={() => definirNotificacoesAberta(!notificacoesAberta)}
                                className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:bg-white transition-all group"
                            >
                                <Bell size={16} className={naoLidas > 0 ? "text-slate-900" : ""} />
                                {naoLidas > 0 && (
                                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {/* Menu Suspenso de Notificações */}
                            {notificacoesAberta && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[40]"
                                        onClick={() => definirNotificacoesAberta(false)}
                                    ></div>
                                    <div className="absolute right-0 top-full mt-4 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-[50] overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-sm">
                                            <h3 className="font-bold text-slate-700">Notificações</h3>
                                            {naoLidas > 0 && (
                                                <button
                                                    onClick={marcarTodasComoLidas}
                                                    className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 hover:underline"
                                                >
                                                    Marcar todas como lidas
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {notificacoes.length === 0 ? (
                                                <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                                        <Bell size={20} className="opacity-20" />
                                                    </div>
                                                    <p className="text-sm font-medium">Você está em dia!</p>
                                                    <p className="text-xs opacity-60">Nenhuma nova notificação.</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    {notificacoes.map((notificacao) => (
                                                        <div
                                                            key={notificacao.id}
                                                            className={`
                                                                relative p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group
                                                                ${!notificacao.lida ? 'bg-indigo-50/30' : ''}
                                                            `}
                                                        >
                                                            <div className="flex gap-3">
                                                                <div className={`
                                                                    shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                                                                    ${notificacao.tipo === 'error' ? 'bg-rose-100 text-rose-600' :
                                                                        notificacao.tipo === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                                                            notificacao.tipo === 'warning' ? 'bg-amber-100 text-amber-600' :
                                                                                'bg-indigo-100 text-indigo-600'}
                                                                `}>
                                                                    {notificacao.tipo === 'error' && <XCircle size={16} />}
                                                                    {notificacao.tipo === 'success' && <CheckCircle size={16} />}
                                                                    {notificacao.tipo === 'warning' && <AlertTriangle size={16} />}
                                                                    {(notificacao.tipo === 'info' || !notificacao.tipo) && <Info size={16} />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <h4 className={`text-sm font-bold truncate ${!notificacao.lida ? 'text-slate-900' : 'text-slate-600'}`}>
                                                                            {notificacao.titulo}
                                                                        </h4>
                                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                                                            {new Date(notificacao.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                                        {notificacao.mensagem}
                                                                    </p>
                                                                </div>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removerNotificacao(notificacao.id);
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                                    title="Remover"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                            {!notificacao.lida && (
                                                                <button
                                                                    onClick={() => marcarComoLida(notificacao.id)}
                                                                    className="absolute inset-0 w-full h-full cursor-pointer z-10"
                                                                    title="Marcar como lida"
                                                                ></button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Contêiner de Ações */}
                        {acoes && (
                            <div className="flex items-center gap-5 h-9">
                                <div className="h-6 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-3 h-full">{acoes}</div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Conteúdo da Página */}
                <main className="flex-1 overflow-y-auto p-8 md:p-10 lg:p-12 scroll-smooth z-10 custom-scrollbar bg-slate-50/30">
                    <div className="max-w-[1600px] mx-auto animate-slide-up">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
