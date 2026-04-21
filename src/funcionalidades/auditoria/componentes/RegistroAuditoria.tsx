import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import { bancoLocal } from '@/compartilhado/servicos/bancoLocal';
import { usarPermissoes } from '../../../compartilhado/autorizacao/ContextoPermissoes';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { api } from '@/compartilhado/servicos/api';
import { Botao, CartaoConteudo, Esqueleto } from '@/compartilhado/componentes/UI';
import {
    Activity,
    ChevronLeft,
    ChevronRight,
    Eye,
    Code,
    Clock,
    User,
    Trash2,
    RefreshCw,
    ShieldOff,
    Terminal,
    Fingerprint,
    Search,
    AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { mascararEmail } from '@/compartilhado/utils/formatar';
import { usarTermoBusca } from '@/compartilhado/contextos/ContextoBuscaGlobal';

import ModalUniversal from '@/compartilhado/componentes/ModalUniversal';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';

/**
 * Componente principal da Trilha de Auditoria.
 * Permite visualizar, buscar e inspecionar logs de segurança do sistema.
 */
export default function RegistroAuditoria() {
    const { podeVerLogs, ehAdmin, ehCentral } = usarPermissoes();
    const { dados: logsBrutos, carregando, carregandoInicial, recarregar: carregarLogs } = usarConsulta(
        ['logs-auditoria-online'],
        async () => {
            const logs = await api.obter<any[]>('/seguranca/auditoria');
            return logs.sort((a, b) => {
                const dataA = new Date(a.criado_em || a.criado_at || a.created_at || a.data_criacao || a.timestamp).getTime();
                const dataB = new Date(b.criado_em || b.criado_at || b.created_at || b.data_criacao || b.timestamp).getTime();
                return dataB - dataA;
            });
        }
    );

    const logs = logsBrutos || [];
    const { termo: busca } = usarTermoBusca();
    const [pagina, definirPagina] = useState(1);
    const [logSelecionado, definirLogSelecionado] = useState(null);
    const [mostrarRastroCompleto, definirMostrarRastroCompleto] = useState(false);
    const [mapaUsuarios, definirMapaUsuarios] = useState<Record<string, string>>({});
    const [confirmacao, definirConfirmacao] = useState<{ aberto: boolean, acao: () => void, titulo: string, mensagem: string, variante?: 'perigo' | 'padrao' } | null>(null);

    const LOGS_POR_PAGINA = 15;
    const EH_ADMIN_CENTRAL = ehCentral;

    useEffect(() => {
        carregarUsuarios();
    }, []);

    // Resetar página ao buscar
    useEffect(() => {
        definirPagina(1);
    }, [busca]);

    const carregarUsuarios = async () => {
        try {
            const usuarios = await bancoLocal.listarUsuarios();
            const mapa: Record<string, string> = {};
            usuarios.forEach(u => {
                if (u.nome_completo) mapa[u.email] = u.nome_completo;
            });
            definirMapaUsuarios(mapa);
        } catch (e) {
            console.error('Erro ao carregar usuários para mapeamento:', e);
        }
    };

    /**
     * Remove um registro de log de auditoria (Ação restrita).
     * @param id - UUID do log a ser excluído
     */
    const excluirLog = (id: string) => {
        if (!EH_ADMIN_CENTRAL) return;

        definirConfirmacao({
            aberto: true,
            titulo: 'Remover Log de Auditoria',
            mensagem: 'A exclusão de logs de auditoria compromete a rastreabilidade legal (Marco Civil). Deseja continuar?',
            variante: 'perigo',
            acao: async () => {
                try {
                    const banco = await bancoLocal.iniciarBanco();
                    await banco.delete('logs_auditoria', id);
                    carregarLogs();
                    toast.success("Registro de trilha removido");

                    if (logSelecionado?.id === id) definirLogSelecionado(null);
                } catch (e) {
                    console.error('[Auditoria] Erro ao excluir log:', e);
                    toast.error("Erro ao remover registro.");
                }
            }
        });
    };

    const { usuarioAtual } = usarAutenticacao();
    const [filtroAcao, definirFiltroAcao] = useState<'todos' | 'sucesso' | 'aviso' | 'critico'>('todos');

    const logsFiltrados = logs.filter((l: any) => {
        // Regra de privacidade: logs do madebycotrim são invisíveis para outros usuários
        const ehMadeByCotrim = l.usuario_email?.toLowerCase().includes('madebycotrim');
        const euSouMadeByCotrim = usuarioAtual?.email?.toLowerCase().includes('madebycotrim');
        
        if (ehMadeByCotrim && !euSouMadeByCotrim) return false;

        const matchBusca = !busca.trim() ||
            l.acao?.toLowerCase().includes(busca.toLowerCase()) ||
            l.usuario_email?.toLowerCase().includes(busca.toLowerCase()) ||
            l.entidade_tipo?.toLowerCase().includes(busca.toLowerCase()) ||
            (mapaUsuarios[l.usuario_email] || '').toLowerCase().includes(busca.toLowerCase());

        const act = l.acao?.toUpperCase() || '';
        const matchFiltro = filtroAcao === 'todos'
            ? true
            : filtroAcao === 'sucesso' ? (act.includes('SUCESSO') || act.includes('CRIAR') || act.includes('LOGIN'))
            : filtroAcao === 'aviso' ? (act.includes('ATUALIZAR') || act.includes('EDITAR'))
            : (act.includes('ERRO') || act.includes('DELETAR') || act.includes('EXCLUIR'));

        return matchBusca && matchFiltro;
    });

    const totalPaginas = Math.ceil(logsFiltrados.length / LOGS_POR_PAGINA) || 1;
    const logsPaginados = logsFiltrados.slice((pagina - 1) * LOGS_POR_PAGINA, pagina * LOGS_POR_PAGINA);

    /**
     * Componente interno para exibir o status da ação com badge semântico.
     */
    const BadgeStatus = ({ acao }: { acao: string }) => {
        const act = acao?.toUpperCase() || '';

        let classesCor = 'text-slate-500 bg-slate-400/10 border-slate-200';
        let Icone = Terminal;

        if (act.includes('SUCESSO') || act.includes('LOGIN')) {
            classesCor = 'text-emerald-600 bg-emerald-500/10 border-emerald-100';
            Icone = Activity;
        }
        if (act.includes('CRIAR') || act.includes('ADICIONAR')) {
            classesCor = 'text-indigo-600 bg-indigo-500/10 border-indigo-100';
            Icone = RefreshCw;
        }
        if (act.includes('ERRO') || act.includes('DELETAR') || act.includes('EXCLUIR')) {
            classesCor = 'text-rose-600 bg-rose-500/10 border-rose-100';
            Icone = ShieldOff;
        }
        if (act.includes('ATUALIZAR') || act.includes('EDITAR')) {
            classesCor = 'text-amber-600 bg-amber-500/10 border-amber-100';
            Icone = RefreshCw;
        }

        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${classesCor}`}>
                <Icone size={12} strokeWidth={3} />
                {acao}
            </div>
        );
    };

    if (!podeVerLogs) {
        return (
            <LayoutAdministrativo titulo="Registro de Segurança" subtitulo="Acompanhamento de ações realizadas no sistema" acoes={null}>
                <div className="flex flex-col items-center justify-center h-96 gap-4 text-slate-400 opacity-50 grayscale">
                    <ShieldOff size={64} strokeWidth={1} />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">Acesso restrito à direção e coordenação</p>
                </div>
            </LayoutAdministrativo>
        );
    }

    return (
        <LayoutAdministrativo
            titulo="Trilha de Auditoria"
            subtitulo="Segurança total: rastro forense de todas as operações realizadas no sistema"
            acoes={<Botao variante="secundario" tamanho="sm" icone={RefreshCw} carregando={carregando} onClick={carregarLogs}>Atualizar Cache</Botao>}
        >
            {/* Quick Stats Summary Luxury */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 mt-2">
                {[
                    { label: 'Fluxo Total', val: logsFiltrados.length, icon: Activity, col: 'indigo', glow: 'shadow-[0_0_20px_rgba(79,70,229,0.15)]' },
                    { label: 'Operações Ok', val: logsFiltrados.filter((l: any) => l.acao?.toUpperCase().includes('SUCESSO') || l.acao?.toUpperCase().includes('LOGIN')).length, icon: Activity, col: 'emerald', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
                    { label: 'Avisos/Edições', val: logsFiltrados.filter((l: any) => l.acao?.toUpperCase().includes('ATUALIZAR') || l.acao?.toUpperCase().includes('EDITAR')).length, icon: Code, col: 'amber', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
                    { label: 'Alertas Críticos', val: logsFiltrados.filter((l: any) => l.acao?.toUpperCase().includes('ERRO') || l.acao?.toUpperCase().includes('DELETAR')).length, icon: AlertTriangle, col: 'rose', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]' }
                ].map((stat, i) => (
                    <div key={i} className={`bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-[2rem] ${stat.glow} hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group`}>
                        <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-[1.2rem] bg-${stat.col}-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform`}>
                                <stat.icon size={24} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">{stat.label}</span>
                                <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{stat.val}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mb-10 flex flex-col md:flex-row items-center bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl p-6 rounded-[2.5rem] gap-8">
                <div className="flex flex-col gap-2.5 flex-1 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 leading-none">Rastrear Evento / Protocolo</label>
                    <div className="relative group">
                        <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-all duration-300" />
                        <input 
                            placeholder="Buscar por usuário, ação ou tipo de dado..."
                            value={busca}
                            className="w-full bg-white/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all h-14 pl-16 pr-6 rounded-2xl text-[13px] font-bold text-slate-700 outline-none shadow-sm"
                            readOnly 
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2.5 shrink-0 w-full md:w-auto">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 leading-none">Filtro de Severidade</label>
                    <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 h-14 shadow-xl">
                        {[
                            { id: 'todos', label: 'TUDO', icone: Terminal },
                            { id: 'sucesso', label: 'OK', icone: Activity },
                            { id: 'aviso', label: 'LOGS', icone: Code },
                            { id: 'critico', label: 'ALERTAS', icone: AlertTriangle }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => definirFiltroAcao(item.id as any)}
                                className={`px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${filtroAcao === item.id
                                    ? 'bg-white text-slate-900 shadow-2xl'
                                    : 'text-slate-500 hover:text-white'
                                    }`}
                            >
                                <item.icone size={14} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col h-[calc(100vh-320px)]">
                {/* Table Area */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    {/* Linha da Timeline Forense */}
                    <div className="absolute left-[40px] top-[70px] bottom-0 w-[1px] bg-slate-200/50 z-0" />

                    <table className="w-full text-left border-separate border-spacing-0 relative z-10">
                        <thead className="bg-slate-900 sticky top-0 z-30">
                            <tr>
                                <th scope="col" className="pl-14 pr-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] w-[250px]">Operação Forense</th>
                                <th scope="col" className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-left">Autor da Ação</th>
                                <th scope="col" className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-center w-[180px]">Módulo</th>
                                <th scope="col" className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-center w-[240px]">Cronologia</th>
                                <th scope="col" className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-right w-[150px]">Rastro</th>
                            </tr>
                        </thead>
                        <tbody className="relative">
                            {carregandoInicial ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse relative z-10">
                                        <td className="py-8 pl-14"><Esqueleto className="w-40 h-8 rounded-xl" /></td>
                                        <td className="py-8 px-6">
                                            <div className="flex items-center gap-4">
                                                <Esqueleto className="w-12 h-12 rounded-[1rem]" />
                                                <div className="space-y-3">
                                                    <Esqueleto className="w-48 h-3" />
                                                    <Esqueleto className="w-32 h-2 opacity-40" />
                                                </div>
                                            </div>
                                        </td>
                                        <td colSpan={3} className="px-6 py-8"><Esqueleto className="w-full h-4 rounded-xl" /></td>
                                    </tr>
                                ))
                            ) : logsPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-40 text-center relative z-10">
                                        <div className="flex flex-col items-center justify-center gap-8 opacity-20">
                                            <Activity size={80} strokeWidth={1} />
                                            <span className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-900">Nenhum rastro identificado</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                (logsPaginados || []).map((log: any) => (
                                    <tr key={log.id} className="group/row transition-all duration-300 hover:bg-white hover:shadow-xl hover:scale-[1.002] relative z-10">
                                        <td className="pl-14 py-8 align-middle relative">
                                            {/* Ponto da Timeline Glow */}
                                            <div className="absolute left-[36px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-200 border-2 border-white group-hover/row:bg-indigo-500 group-hover/row:scale-150 group-hover/row:shadow-[0_0_10px_rgba(79,70,229,1)] transition-all duration-300 z-10" />
                                            
                                            <div className="flex items-center">
                                                <BadgeStatus acao={log.acao} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 align-middle">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-[1.2rem] bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-lg group-hover/row:scale-110 transition-transform">
                                                    <User size={20} strokeWidth={2.5} />
                                                </div>
                                                <div className="flex flex-col text-left truncate">
                                                    <span className="text-[14px] font-black text-slate-900 tracking-tight leading-tight uppercase group-hover/row:text-indigo-600 transition-colors">
                                                        {mapaUsuarios[log.usuario_email] || log.usuario_email.split('@')[0]}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">
                                                        {mascararEmail(log.usuario_email)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 align-middle text-center">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-100/50 px-4 py-1.5 rounded-full border border-slate-200/50 group-hover/row:bg-white transition-all">
                                                {log.entidade_tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-8 align-middle text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-2.5 bg-slate-900 px-4 py-2 rounded-xl text-white shadow-lg">
                                                    <Clock size={12} className="text-indigo-400" />
                                                    <span className="text-[11px] font-black tracking-widest">
                                                        {format(new Date(log.criado_em || log.criado_at || log.created_at || log.data_criacao || log.timestamp), "HH:mm:ss")}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                                                    {format(new Date(log.criado_em || log.criado_at || log.created_at || log.data_criacao || log.timestamp), "dd MMM yyyy", { locale: ptBR })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 align-middle text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover/row:opacity-100 transition-all transform translate-x-4 group-hover/row:translate-x-0">
                                                <button
                                                    onClick={() => { definirLogSelecionado(log); definirMostrarRastroCompleto(false); }}
                                                    className="w-12 h-12 rounded-[1.2rem] bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-xl active:scale-90"
                                                    title="Inspecionar Rastro"
                                                >
                                                    <Eye size={20} />
                                                </button>

                                                {EH_ADMIN_CENTRAL && (
                                                    <button
                                                        onClick={() => excluirLog(log.id)}
                                                        className="w-12 h-12 rounded-[1.2rem] bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-xl active:scale-90"
                                                        title="Remover Registro"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination Luxury */}
                <div className="px-14 py-8 border-t border-white/20 bg-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Indexação</span>
                            <span className="text-sm font-black text-white uppercase tracking-[0.2em]">Página {pagina} de {totalPaginas}</span>
                        </div>
                        <div className="h-10 w-px bg-white/10"></div>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-indigo-500 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                                <Activity size={14} className="text-white" />
                            </div>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{logsFiltrados.length} Registros Forenses</span>
                        </div>
                    </div>

                    <div className="flex gap-4 p-2 bg-white/5 rounded-2xl">
                        <button
                            disabled={pagina === 1}
                            onClick={() => definirPagina(p => p - 1)}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white hover:text-slate-900 disabled:opacity-20 transition-all active:scale-90 shadow-xl"
                        >
                            <ChevronLeft size={22} strokeWidth={3} />
                        </button>
                        <button
                            disabled={pagina === totalPaginas}
                            onClick={() => definirPagina(p => p + 1)}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white hover:text-slate-900 disabled:opacity-20 transition-all active:scale-90 shadow-xl"
                        >
                            <ChevronRight size={22} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>

            {logSelecionado && (
                <ModalUniversal
                    titulo="Inspecionar Evidência"
                    subtitulo="Detalhamento forense do rastro de atividade selecionado"
                    icone={Terminal}
                    aoFechar={() => definirLogSelecionado(null)}
                    tamanho="lg"
                >
                    <div className="space-y-8 pb-8 pt-4">
                        {/* Header do Inspetor */}
                        <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(43,89,255,0.1),transparent)] pointer-events-none" />
                            
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="p-4 bg-white/10 rounded-[1.5rem] backdrop-blur-md border border-white/10 text-indigo-400 shadow-2xl">
                                    <Fingerprint size={32} strokeWidth={2} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Protocolo de Rastro</span>
                                    <span className="font-mono text-[11px] text-white bg-white/5 px-4 py-2 rounded-xl border border-white/10 tracking-widest shadow-inner">
                                        {logSelecionado.id}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end mt-6 md:mt-0 relative z-10">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Registro Cronológico</span>
                                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                                    <Clock size={16} className="text-emerald-400" />
                                    <span className="text-[13px] font-black text-white tracking-widest">
                                        {format(new Date(logSelecionado.criado_em || logSelecionado.criado_at || logSelecionado.created_at || logSelecionado.data_criacao || logSelecionado.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Comparação de Dados Forense */}
                        {(() => {
                            let antStr = "// Nenhum dado anterior";
                            let novStr = "// Sem alterações";

                            try {
                                const brutoAnt = logSelecionado.dados_anteriores || logSelecionado.dado_anterior || logSelecionado.anterior || logSelecionado.estado_anterior;
                                let dadosAnt = brutoAnt && typeof brutoAnt === 'string' ? JSON.parse(brutoAnt) : brutoAnt;

                                const brutoNov = logSelecionado.dados_novos || logSelecionado.dado_novo || logSelecionado.novo || logSelecionado.estado_novo;
                                let dadosNov = brutoNov && typeof brutoNov === 'string' ? JSON.parse(brutoNov) : brutoNov;

                                if (mostrarRastroCompleto) {
                                    antStr = dadosAnt && Object.keys(dadosAnt).length > 0 ? JSON.stringify(dadosAnt, null, 4) : String(dadosAnt || "// Nenhum dado anterior");
                                    novStr = dadosNov && Object.keys(dadosNov).length > 0 ? JSON.stringify(dadosNov, null, 4) : String(dadosNov || "// Sem dados novos");
                                } else if (dadosAnt || dadosNov) {
                                    const objAnt = typeof dadosAnt === 'object' && dadosAnt !== null ? dadosAnt : {};
                                    const objNov = typeof dadosNov === 'object' && dadosNov !== null ? dadosNov : {};

                                    const chavesTotais = new Set([...Object.keys(objAnt), ...Object.keys(objNov)]);
                                    const diffAnterior: Record<string, any> = {};
                                    const diffNovo: Record<string, any> = {};

                                    const chavesIgnoradas = ['atualizado_em', 'sincronizado', 'criado_em', 'via', 'escola_id'];

                                    chavesTotais.forEach(chave => {
                                        if (chavesIgnoradas.includes(chave)) return;

                                        const valAnt = objAnt[chave];
                                        const valNov = objNov[chave];

                                        if (JSON.stringify(valAnt) !== JSON.stringify(valNov)) {
                                            if (valAnt !== undefined) diffAnterior[chave] = valAnt;
                                            if (valNov !== undefined) diffNovo[chave] = valNov;
                                        }
                                    });

                                    antStr = Object.keys(diffAnterior).length > 0 ? JSON.stringify(diffAnterior, null, 4) : "// Nenhuma propriedade alterada";
                                    novStr = Object.keys(diffNovo).length > 0 ? JSON.stringify(diffNovo, null, 4) : "// Nenhuma propriedade alterada";
                                }
                            } catch (e) {
                                antStr = String(logSelecionado.dados_anteriores || logSelecionado.dado_anterior || "// Dados corrompidos");
                                novStr = String(logSelecionado.dados_novos || logSelecionado.dado_novo || "// Sem dados novos");
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Snapshot Anterior</span>
                                            {!mostrarRastroCompleto && <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">Divergências</span>}
                                        </div>
                                        <div className="bg-slate-900 rounded-[2rem] p-8 min-h-[350px] border border-slate-800 shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                            </div>
                                            <pre className="text-[12px] font-mono text-rose-300/60 leading-relaxed whitespace-pre-wrap overflow-auto custom-scrollbar-dark h-[300px]">
                                                {antStr}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Persistência Nova</span>
                                            {!mostrarRastroCompleto && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Atualizado</span>}
                                        </div>
                                        <div className="bg-slate-900 rounded-[2rem] p-8 min-h-[350px] border border-slate-800 shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            </div>
                                            <pre className="text-[12px] font-mono text-emerald-300/60 leading-relaxed whitespace-pre-wrap overflow-auto custom-scrollbar-dark h-[300px]">
                                                {novStr}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}


                        {/* Ações e Rastro Completo (Luxury Controls) */}
                        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                            <button
                                onClick={() => definirMostrarRastroCompleto(!mostrarRastroCompleto)}
                                className="flex items-center gap-4 group cursor-pointer active:scale-95 transition-all"
                            >
                                <div className={`w-3 h-3 rounded-full transition-all duration-500 ${mostrarRastroCompleto ? 'bg-indigo-500 shadow-[0_0_12px_rgba(79,70,229,1)] scale-125' : 'bg-slate-200'}`}></div>
                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${mostrarRastroCompleto ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {mostrarRastroCompleto ? 'RESTRINGIR A DIVERGÊNCIAS' : 'RESTAURAR OBJETO COMPLETO'}
                                </span>
                            </button>

                            <button
                                onClick={() => { definirLogSelecionado(null); definirMostrarRastroCompleto(false); }}
                                className="px-10 h-14 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-2xl active:scale-95"
                            >
                                Finalizar Inspeção
                            </button>
                        </div>
                    </div>
                </ModalUniversal>
            )}

            {confirmacao?.aberto && (
                <ModalConfirmacao
                    titulo={confirmacao.titulo}
                    mensagem={confirmacao.mensagem}
                    aoConfirmar={() => {
                        confirmacao.acao();
                        definirConfirmacao(null);
                    }}
                    aoCancelar={() => definirConfirmacao(null)}
                    variante={confirmacao.variante}
                />
            )}
        </LayoutAdministrativo>
    );
}

