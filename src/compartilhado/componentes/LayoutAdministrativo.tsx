import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { usarPermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';
import { usarNotificacoes } from '@compartilhado/contextos/ContextoNotificacoes';
import { usarTenant } from '@tenant/provedorTenant';
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
    AlertTriangle
} from 'lucide-react';
import { servicoSincronizacao } from '@compartilhado/servicos/sincronizacao';
import { EMAIL_ADMIN_RAIZ } from '@compartilhado/constantes/configuracao';
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
    const { ehAdmin, usuario, pode } = usarPermissoes();
    const navegar = useNavigate();
    const localizacao = useLocation();
    const { id: slugEscola } = usarTenant();

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
                { icone: Clock, texto: 'Acessos', rota: '/horarios' },
                { icone: AlertTriangle, texto: 'Evasão', rota: '/evasao' },
                { icone: FileText, texto: 'Relatórios', rota: '/relatorios' },
            ]
        }
    ];

    // Itens exclusivos para ADMIN
    const itensMenuAdmin = [

        { icone: FileText, texto: 'Logs de Auditoria', rota: '/logs' },
        { icone: Shield, texto: 'Usuários do Sistema', rota: '/usuarios' },
    ];


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
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-100">
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
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-100">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-indigo-50/50">
                        <Crown size={40} className="text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Bem-vindo(a) ao SCAE!</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Você recebeu acesso de <span className="font-bold text-indigo-600">{usuario.papel}</span>.
                        Para continuar, confirme seus dados e aceite o convite para utilizar o sistema.
                    </p>

                    <button
                        onClick={confirmarAcesso}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
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
                    bg-[#0f172a] border-r border-slate-800
                    flex flex-col transition-all duration-300 ease-in-out shadow-lg relative
                    ${sidebarAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${sidebarMinimizado ? 'lg:w-20' : 'lg:w-64'}
                    w-64
                `}
            >
                {/* Seção do Logo (Clean) */}
                <div className={`
                    h-16 flex items-center border-b border-slate-800/50 relative z-10
                    ${sidebarMinimizado ? 'justify-center px-0' : 'justify-between px-6'}
                `}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="shrink-0 w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white">
                            <ShieldCheck className="w-5 h-5" />
                        </div>

                        {!sidebarMinimizado && (
                            <div className="flex flex-col ml-1">
                                <h1 className="font-bold text-lg text-white leading-tight flex items-center">
                                    SCAE<span className="text-indigo-400">.</span>
                                </h1>
                                <p className="text-xs text-slate-400">CEM 03 Taguatinga</p>
                            </div>
                        )}
                    </div>

                    {/* Botão de Alternância (Discreto) */}
                    <button
                        onClick={() => definirSidebarMinimizado(!sidebarMinimizado)}
                        className={`
                            absolute -right-3 top-1/2 -translate-y-1/2 
                            w-6 h-6 bg-slate-800 border border-slate-700 rounded-full 
                            flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700
                            z-50 hidden lg:flex transition-colors
                        `}
                    >
                        {sidebarMinimizado ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
                                        <p className="px-3 text-xs font-semibold text-slate-500 mb-2 mt-4 first:mt-0">
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
                                                        w-full flex items-center transition-colors
                                                        ${sidebarMinimizado ? 'justify-center p-2.5 rounded-lg' : 'gap-3 px-3 py-2 rounded-lg'}
                                                        ${ativo
                                                            ? 'bg-gray-800 text-white'
                                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                                        }
                                                    `}
                                                    title={sidebarMinimizado ? item.texto : ""}
                                                >
                                                    <Icone
                                                        size={18}
                                                        className={ativo ? 'text-indigo-400' : ''}
                                                    />

                                                    {!sidebarMinimizado && (
                                                        <span className="text-sm font-medium">
                                                            {item.texto}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Seção Administrativa */}
                    {ehAdmin && (
                        <div>
                            {!sidebarMinimizado && (
                                <div className="mt-6 mb-2">
                                    <p className="px-3 text-xs font-semibold text-slate-500">
                                        Administração
                                    </p>
                                </div>
                            )}

                            <div className="space-y-0.5">
                                {itensMenuAdmin.map((item) => {
                                    const Icone = item.icone;
                                    const ativo = localizacao.pathname.startsWith(`${prefixoAdmin}${item.rota}`);

                                    return (
                                        <button
                                            key={item.rota}
                                            onClick={() => navegar(`${prefixoAdmin}${item.rota}`)}
                                            className={`
                                                w-full flex items-center transition-colors
                                                ${sidebarMinimizado ? 'justify-center p-2.5 rounded-lg' : 'gap-3 px-3 py-2 rounded-lg'}
                                                ${ativo
                                                    ? 'bg-gray-800 text-white'
                                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                                }
                                            `}
                                            title={sidebarMinimizado ? item.texto : ""}
                                        >
                                            <Icone
                                                size={18}
                                                className={ativo ? 'text-white' : ''}
                                            />
                                            {!sidebarMinimizado && (
                                                <span className="text-sm font-medium">
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
                <div className="p-4 border-t border-gray-800 bg-gray-950 z-10">
                    <div className={`flex items-center ${sidebarMinimizado ? 'justify-center flex-col gap-4' : 'gap-3 mb-4 px-1'}`}>
                        <div className="relative group cursor-pointer">
                            <div className="w-9 h-9 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-gray-300 font-bold text-sm">
                                {usuarioAtual?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-950"></div>
                        </div>

                        {!sidebarMinimizado && (
                            <div className="flex-1 min-w-0 animate-fade-in">
                                <p className="text-sm font-semibold text-white truncate">
                                    {usuarioAtual?.email?.split('@')[0] || 'Usuário'}
                                </p>
                                <p className="text-xs text-slate-400 truncate" title={usuarioAtual?.email}>
                                    {usuarioAtual?.email}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className={`mt-2 ${sidebarMinimizado ? 'flex flex-col gap-3 items-center' : 'space-y-2'}`}>
                        <button
                            onClick={aoSair}
                            className={`
                                flex items-center justify-center transition-colors
                                bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white
                                ${sidebarMinimizado ? 'w-9 h-9 rounded-lg p-0' : 'w-full gap-2 px-3 py-2 rounded-lg'}
                            `}
                            title={sidebarMinimizado ? "Sair" : ""}
                        >
                            <LogOut size={16} />
                            {!sidebarMinimizado && <span className="text-sm font-medium">Sair</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Area de Conteúdo Principal */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50 relative overflow-hidden">

                {/* Cabeçalho */}
                <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => definirSidebarAberto(!sidebarAberto)}
                            className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                        >
                            <Menu size={20} />
                        </button>

                        <div>
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">{titulo}</h1>
                            {subtitulo && <p className="text-sm text-slate-500 hidden sm:block">{subtitulo}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Barra de Busca - Oculta em telas pequenas */}
                        <div className="hidden md:flex items-center relative group">
                            <Search className="absolute left-3 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar no sistema..."
                                className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md text-sm w-64 focus:w-80 outline-none transition-all duration-200"
                            />
                        </div>

                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        {/* Notificações */}
                        <div className="relative">
                            <button
                                onClick={() => definirNotificacoesAberta(!notificacoesAberta)}
                                className="relative p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                            >
                                <Bell size={20} className={naoLidas > 0 ? "text-blue-600" : ""} />
                                {naoLidas > 0 && (
                                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                                )}
                            </button>

                            {/* Menu Suspenso de Notificações */}
                            {notificacoesAberta && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[40]"
                                        onClick={() => definirNotificacoesAberta(false)}
                                    ></div>
                                    <div className="absolute right-0 top-full mt-4 w-80 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-[50] overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-sm">
                                            <h3 className="font-bold text-slate-700">Notificações</h3>
                                            {naoLidas > 0 && (
                                                <button
                                                    onClick={marcarTodasComoLidas}
                                                    className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800 hover:underline"
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
                                                                ${!notificacao.lida ? 'bg-indigo-50/40' : ''}
                                                            `}
                                                        >
                                                            <div className="flex gap-3">
                                                                <div className={`
                                                                    shrink-0 w-2 h-2 mt-2 rounded-full ring-2 ring-white
                                                                    ${!notificacao.lida ? 'bg-indigo-500' : 'bg-slate-300'}
                                                                `}></div>
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
                            <>
                                <div className="h-8 w-px bg-slate-200 mx-2"></div>
                                <div className="flex items-center gap-3">{acoes}</div>
                            </>
                        )}
                    </div>
                </header>

                {/* Conteúdo da Página */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scroll-smooth z-10 custom-scrollbar">
                    <div className="max-w-[1600px] mx-auto animate-slide-up">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
