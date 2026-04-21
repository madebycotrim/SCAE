import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import { bancoLocal } from '@/compartilhado/servicos/bancoLocal';
import { usarPermissoes } from '../../../compartilhado/autorizacao/ContextoPermissoes';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { api } from '@/compartilhado/servicos/api';
import { Botao, BarraFiltro, InputBusca, CardMetrica, Esqueleto } from '@/compartilhado/componentes/UI';
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
    AlertTriangle,
    ArrowRight
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
    const { termo: busca, definirTermo } = usarTermoBusca();
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
    /**
     * Componente interno para exibir o status da ação com design de pill e indicador (Estilo Turno).
     */
    const BadgeStatus = ({ acao }: { acao: string }) => {
        const act = acao?.toUpperCase() || '';

        let config = {
            fundo: 'bg-slate-50',
            texto: 'text-slate-700',
            borda: 'border-slate-200',
            indicador: 'bg-slate-400'
        };

        if (act.includes('SUCESSO') || act.includes('LOGIN')) {
            config = {
                fundo: 'bg-emerald-50',
                texto: 'text-emerald-700',
                borda: 'border-emerald-200',
                indicador: 'bg-emerald-500'
            };
        } else if (act.includes('CRIAR') || act.includes('ADICIONAR') || act.includes('LOGIN')) {
            config = {
                fundo: 'bg-indigo-50',
                texto: 'text-indigo-700',
                borda: 'border-indigo-200',
                indicador: 'bg-indigo-500'
            };
        } else if (act.includes('ERRO') || act.includes('DELETAR') || act.includes('EXCLUIR')) {
            config = {
                fundo: 'bg-rose-50',
                texto: 'text-rose-700',
                borda: 'border-rose-200',
                indicador: 'bg-rose-500'
            };
        } else if (act.includes('ATUALIZAR') || act.includes('EDITAR')) {
            config = {
                fundo: 'bg-amber-50',
                texto: 'text-amber-700',
                borda: 'border-amber-200',
                indicador: 'bg-amber-500'
            };
        }

        return (
            <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border ${config.fundo} ${config.texto} ${config.borda}`}>
                <div className={`w-1 h-1 rounded-full ${config.indicador}`}></div>
                {acao}
            </span>
        );
    };

    if (!podeVerLogs) {
        return (
            <LayoutAdministrativo titulo="Logs" subtitulo="Acesso restrito — permissões insuficientes" acoes={null}>
                <div className="flex flex-col items-center justify-center h-96 gap-4 text-slate-400 opacity-50 grayscale">
                    <ShieldOff size={64} strokeWidth={1} />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">Acesso restrito à direção e coordenação</p>
                </div>
            </LayoutAdministrativo>
        );
    }

    return (
        <LayoutAdministrativo 
            titulo="Logs"
            subtitulo="Rastreabilidade completa de todas as operações realizadas no sistema"
            acoes={<Botao variante="secundario" tamanho="sm" icone={RefreshCw} carregando={carregando} onClick={carregarLogs}>Atualizar Cache</Botao>}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 mt-2">
                <CardMetrica 
                    label="Fluxo Total"
                    valor={logsFiltrados.length}
                    icone={Activity}
                    variante="indigo"
                    className="!shadow-none !border-slate-100"
                />
                <CardMetrica 
                    label="Operações Ok"
                    valor={logsFiltrados.filter((l: any) => l.acao?.toUpperCase().includes('SUCESSO') || l.acao?.toUpperCase().includes('LOGIN')).length}
                    icone={Activity}
                    variante="verde"
                    className="!shadow-none !border-slate-100"
                />
                <CardMetrica 
                    label="Logs / Edições"
                    valor={logsFiltrados.filter((l: any) => l.acao?.toUpperCase().includes('ATUALIZAR') || l.acao?.toUpperCase().includes('EDITAR')).length}
                    icone={Activity}
                    variante="roxo"
                    className="!shadow-none !border-slate-100"
                />
                <CardMetrica 
                    label="Alertas Críticos"
                    valor={logsFiltrados.filter((l: any) => l.acao?.toUpperCase().includes('ERRO') || l.acao?.toUpperCase().includes('DELETAR')).length}
                    icone={AlertTriangle}
                    variante="rosa"
                    className="!shadow-none !border-slate-100"
                />
            </div>

            <BarraFiltro>
                <div className="flex flex-col gap-2 flex-1 w-full text-left">
                    <label className="text-[10px] font-bold text-slate-800 uppercase tracking-widest ml-1 leading-none">Rastrear Evento / Protocolo</label>
                    <InputBusca 
                        placeholder="Buscar por usuário, ação ou tipo de dado..."
                        value={busca}
                        onChange={(e) => definirTermo(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-2 shrink-0 w-full lg:w-auto text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 leading-none">Filtro de Severidade</label>
                    <div className="flex items-center bg-slate-100/30 p-1 rounded-xl h-10 min-w-[320px] border border-slate-200/50">
                        {[
                            { id: 'todos', label: 'Tudo' },
                            { id: 'sucesso', label: 'Ok' },
                            { id: 'aviso', label: 'Logs' },
                            { id: 'critico', label: 'Alertas' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => definirFiltroAcao?.(item.id as any)}
                                className={`flex-1 h-full rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all duration-200 ${filtroAcao === item.id
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </BarraFiltro>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-320px)]">
                {/* Table Area */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    {/* Linha da Timeline Forense */}
                    <div className="absolute left-[40px] top-[70px] bottom-0 w-[1px] bg-slate-200/50 z-0" />

                    <table className="w-full text-left border-separate border-spacing-0 relative z-10">
                        <thead className="border-b border-slate-100 sticky top-0 z-30 bg-white">
                            <tr>
                                <th scope="col" className="pl-14 pr-6 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identificação</th>
                                <th scope="col" className="px-6 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Autor da Ação</th>
                                <th scope="col" className="px-6 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Módulo</th>
                                <th scope="col" className="px-6 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sinalização</th>
                                <th scope="col" className="px-6 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cronologia</th>
                                <th scope="col" className="px-10 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
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
                                </tr>                            ) : (
                                (logsPaginados || []).map((log: any) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-all duration-150 group cursor-pointer border-b border-slate-100/60" onClick={() => { definirLogSelecionado(log); definirMostrarRastroCompleto(false); }}>
                                        <td className="pl-14 py-6">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">{log.acao}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">ID: {log.id.split('-')[0]}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 group-hover:bg-white transition-colors">
                                                    <User size={16} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 tracking-tight uppercase">
                                                        {mapaUsuarios[log.usuario_email] || log.usuario_email.split('@')[0]}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                                        {mascararEmail(log.usuario_email)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-tight rounded-lg border border-slate-200 shadow-sm group-hover:bg-white transition-colors">
                                                {log.entidade_tipo || 'SISTEMA'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <BadgeStatus acao={log.acao} />
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                                    <span className="text-slate-900">{format(new Date(log.criado_em || log.criado_at || log.created_at || log.data_criacao || log.timestamp), "HH:mm:ss")}</span>
                                                    <span className="text-slate-400">{format(new Date(log.criado_em || log.criado_at || log.created_at || log.data_criacao || log.timestamp), "dd MMM yyyy", { locale: ptBR })}</span>
                                                </div>
                                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                    <div className="h-full bg-slate-900 w-full opacity-20"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => { definirLogSelecionado(log); definirMostrarRastroCompleto(false); }}
                                                    className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                    title="Inspecionar Rastro"
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                {EH_ADMIN_CENTRAL && (
                                                    <button
                                                        onClick={() => excluirLog(log.id)}
                                                        className="w-9 h-9 flex items-center justify-center bg-slate-50 text-rose-400 border border-slate-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                        title="Remover Registro"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}

                                                <button
                                                    className="w-9 h-9 flex items-center justify-center bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all shadow-lg active:scale-90"
                                                    onClick={() => { definirLogSelecionado(log); definirMostrarRastroCompleto(false); }}
                                                >
                                                    <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination Minimalista */}
                <div className="px-10 py-6 border-t border-slate-100 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-10">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">Indexação</span>
                            <span className="text-sm font-bold text-slate-900 tracking-tight leading-none uppercase">Página {pagina} de {totalPaginas}</span>
                        </div>
                        <div className="h-8 w-px bg-slate-100 hidden md:block"></div>
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-slate-50 border border-slate-200 text-slate-400 rounded-lg flex items-center justify-center">
                                <Activity size={14} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{logsFiltrados.length} Registros</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            disabled={pagina === 1}
                            onClick={() => definirPagina(p => p - 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white disabled:opacity-20 transition-all active:scale-90 shadow-sm"
                        >
                            <ChevronLeft size={16} strokeWidth={2} />
                        </button>
                        <button
                            disabled={pagina === totalPaginas}
                            onClick={() => definirPagina(p => p + 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-20 transition-all active:scale-90 shadow-md"
                        >
                            <ChevronRight size={16} strokeWidth={2} />
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
                    <div className="space-y-8 pt-4">
                        {/* Header do Inspetor Minimalista */}
                        <div className="flex flex-col md:flex-row items-center justify-between p-10 bg-slate-50 border border-slate-100 rounded-[2rem] relative overflow-hidden">
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-400 shadow-sm">
                                    <Fingerprint size={24} strokeWidth={2} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Protocolo de Rastro</span>
                                    <span className="font-mono text-[11px] text-slate-900 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm tracking-tight">
                                        {logSelecionado.id}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end mt-6 md:mt-0 relative z-10">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Registro Cronológico</span>
                                <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    <Clock size={14} className="text-slate-400" />
                                    <span className="text-[12px] font-bold text-slate-900 tracking-tight">
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
                                        <div className="bg-white rounded-[1.5rem] p-8 border border-slate-200 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            </div>
                                            <pre className="text-[12px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap overflow-auto custom-scrollbar max-h-[350px]">
                                                {antStr}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Persistência Nova</span>
                                            {!mostrarRastroCompleto && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Atualizado</span>}
                                        </div>
                                        <div className="bg-white rounded-[1.5rem] p-8 border border-slate-200 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            </div>
                                            <pre className="text-[12px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap overflow-auto custom-scrollbar max-h-[350px]">
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
                                <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${mostrarRastroCompleto ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {mostrarRastroCompleto ? 'RESTRINGIR A DIVERGÊNCIAS' : 'RESTAURAR OBJETO COMPLETO'}
                                </span>
                            </button>

                            <button
                                onClick={() => { definirLogSelecionado(null); definirMostrarRastroCompleto(false); }}
                                className="px-10 h-12 rounded-xl bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
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

