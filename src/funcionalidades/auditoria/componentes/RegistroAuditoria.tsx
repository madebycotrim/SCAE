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

    const LOGS_PER_PAGE = 15;
    const EH_ADMIN_SUPREMO = ehCentral; // << Mudança aqui: de ehAdmin para ehCentral

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

    const excluirLog = (id: string) => {
        if (!EH_ADMIN_SUPREMO) return;

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
                    console.error(e);
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

    const totalPaginas = Math.ceil(logsFiltrados.length / LOGS_PER_PAGE) || 1;
    const logsPaginados = logsFiltrados.slice((pagina - 1) * LOGS_PER_PAGE, pagina * LOGS_PER_PAGE);

    const StatusBadge = ({ action }: { action: string }) => {
        const act = action?.toUpperCase() || '';

        let colorClasses = 'text-slate-500 bg-slate-400/10 border-slate-200';
        let Icone = Terminal;

        if (act.includes('SUCESSO') || act.includes('LOGIN')) {
            colorClasses = 'text-emerald-600 bg-emerald-500/10 border-emerald-100';
            Icone = Activity;
        }
        if (act.includes('CRIAR') || act.includes('ADICIONAR')) {
            colorClasses = 'text-indigo-600 bg-indigo-500/10 border-indigo-100';
            Icone = RefreshCw;
        }
        if (act.includes('ERRO') || act.includes('DELETAR') || act.includes('EXCLUIR')) {
            colorClasses = 'text-rose-600 bg-rose-500/10 border-rose-100';
            Icone = ShieldOff;
        }
        if (act.includes('ATUALIZAR') || act.includes('EDITAR')) {
            colorClasses = 'text-amber-600 bg-amber-500/10 border-amber-100';
            Icone = RefreshCw;
        }

        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${colorClasses}`}>
                <Icone size={12} strokeWidth={3} />
                {action}
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
            subtitulo="Segurança total: rastro forense de todas as operações realizadas"
            acoes={<Botao variante="secundario" tamanho="sm" icone={RefreshCw} carregando={carregando} onClick={carregarLogs}>Atualizar</Botao>}
            carregando={carregando}
        >
            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-2">
                {[
                    { label: 'Fluxo Total', val: logsFiltrados.length, icon: Activity, col: 'indigo' },
                    { label: 'Operações Ok', val: logsFiltrados.filter((l: any) => l.acao?.toUpperCase().includes('SUCESSO') || l.acao?.toUpperCase().includes('LOGIN')).length, icon: Activity, col: 'emerald' },
                    { label: 'Avisos/Edições', val: logsFiltrados.filter((l: any) => l.acao?.toUpperCase().includes('ATUALIZAR') || l.acao?.toUpperCase().includes('EDITAR')).length, icon: Code, col: 'amber' },
                    { label: 'Alertas Críticos', val: logsFiltrados.filter((l: any) => l.acao?.toUpperCase().includes('ERRO') || l.acao?.toUpperCase().includes('DELETAR')).length, icon: AlertTriangle, col: 'rose' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white border border-slate-200/60 p-5 rounded-[2rem] shadow-suave hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl bg-${stat.col}-50 text-${stat.col}-600 flex items-center justify-center border border-${stat.col}-100 shadow-sm group-hover:scale-110 transition-transform`}>
                                <stat.icon size={20} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">{stat.label}</span>
                                <span className="text-xl font-black text-slate-900 tracking-tighter">{stat.val}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mb-8 flex items-center bg-white border border-slate-200/60 shadow-suave p-5 rounded-[2rem] gap-8">
                <div className="flex flex-col gap-2 flex-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] ml-2 leading-none">Rastrear Evento</label>
                    <div className="relative group">
                        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-all duration-300" />
                        <input 
                            placeholder="Buscar por usuário, ação ou tipo de dado..."
                            value={busca}
                            className="w-full bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-indigo-200 transition-all h-12 pl-14 pr-4 rounded-2xl text-[13px] font-bold text-slate-700 outline-none shadow-inner"
                            readOnly 
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1 leading-none">Severidade</label>
                    <div className="flex items-center bg-slate-50/80 p-1.5 rounded-[1.2rem] border border-slate-200/60 h-12">
                        {[
                            { id: 'todos', label: 'Todos', icone: Terminal },
                            { id: 'sucesso', label: 'Sucesso', icone: Activity },
                            { id: 'aviso', label: 'Logs', icone: Code },
                            { id: 'critico', label: 'Críticos', icone: AlertTriangle }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => definirFiltroAcao(item.id as any)}
                                className={`px-5 h-full rounded-2xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 flex items-center gap-2 border ${filtroAcao === item.id
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20'
                                    : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-white'
                                    }`}
                            >
                                <item.icone size={14} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <CartaoConteudo className="flex flex-col h-[calc(100vh-290px)] overflow-hidden bg-white border border-slate-200/60 shadow-suave rounded-[2.5rem]">
                {/* Table Area */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    {/* Linha da Timeline (Movida para fora do tbody) */}
                    <div className="absolute left-[34px] top-[60px] bottom-0 w-[2px] bg-slate-100 z-0" />

                    <table className="w-full text-left border-separate border-spacing-0 relative z-10">
                        <thead className="bg-slate-50/50 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100">
                            <tr>
                                <th scope="col" className="pl-12 pr-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[220px]">Operação</th>
                                <th scope="col" className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Autor da Ação</th>
                                <th scope="col" className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[160px]">Entidade</th>
                                <th scope="col" className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[220px]">Timestamp</th>
                                <th scope="col" className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-[120px]">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="relative">
                            {carregandoInicial ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="animate-fade-in relative z-10">
                                        <td className="py-6 pl-12"><Esqueleto className="w-32 h-6 rounded-xl" /></td>
                                        <td className="py-6 px-6">
                                            <div className="flex items-center gap-4">
                                                <Esqueleto className="w-10 h-10 rounded-2xl" />
                                                <div className="space-y-2">
                                                    <Esqueleto className="w-40 h-3" />
                                                    <Esqueleto className="w-28 h-2 opacity-60" />
                                                </div>
                                            </div>
                                        </td>
                                        <td colSpan={3} className="px-6 py-6"><Esqueleto className="w-full h-4 rounded-lg" /></td>
                                    </tr>
                                ))
                            ) : logsPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center relative z-10">
                                        <div className="flex flex-col items-center justify-center gap-6">
                                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200">
                                                <Activity size={48} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Varredura concluída: Sem registros</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logsPaginados.map((log: any) => (
                                    <tr key={log.id} className="group/row transition-all duration-300 hover:bg-slate-50/50 relative z-10">
                                        <td className="pl-12 py-6 align-middle relative">
                                            {/* Ponto da Timeline */}
                                            <div className="absolute left-[30px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-200 group-hover/row:border-indigo-400 group-hover/row:scale-125 transition-all duration-300 z-10" />
                                            
                                            <div className="flex items-center">
                                                <StatusBadge action={log.acao} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 align-middle">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 shadow-inner group-hover/row:bg-white group-hover/row:text-indigo-500 transition-colors">
                                                    <User size={18} strokeWidth={2.5} />
                                                </div>
                                                <div className="flex flex-col text-left truncate">
                                                    <span className="text-[13px] font-black text-slate-800 tracking-tight leading-tight uppercase">
                                                        {mapaUsuarios[log.usuario_email] || log.usuario_email.split('@')[0]}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                        {mascararEmail(log.usuario_email)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 align-middle text-center">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm group-hover/row:border-slate-200 transition-all">
                                                {log.entidade_tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 align-middle text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 group-hover/row:bg-white transition-all">
                                                    <Clock size={12} className="text-slate-400" />
                                                    <span className="text-[11px] text-slate-700 font-black tracking-tight">
                                                        {format(new Date(log.criado_em || log.criado_at || log.created_at || log.data_criacao || log.timestamp), "HH:mm:ss")}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                    {format(new Date(log.criado_em || log.criado_at || log.created_at || log.data_criacao || log.timestamp), "dd/MM/yyyy", { locale: ptBR })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 align-middle text-right">
                                            <div className="flex justify-end gap-2 opactiy-80 group-hover/row:opacity-100 transition-all">
                                                <button
                                                    onClick={() => { definirLogSelecionado(log); definirMostrarRastroCompleto(false); }}
                                                    className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300"
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                {EH_ADMIN_SUPREMO && (
                                                    <button
                                                        onClick={() => excluirLog(log.id)}
                                                        className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-500/10 transition-all duration-300"
                                                    >
                                                        <Trash2 size={18} />
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

                {/* Footer Pagination Premium */}
                <div className="px-10 py-8 border-t border-slate-50 bg-slate-50/20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3 bg-white border border-slate-100 px-5 py-2.5 rounded-2xl shadow-sm">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none">Página</span>
                            <span className="text-[12px] font-black text-eletrico uppercase tracking-widest leading-none">{pagina} <span className="text-slate-200 mx-2">/</span> {totalPaginas}</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo: {logsFiltrados.length} registros</span>
                    </div>

                    <div className="flex gap-3">
                        <Botao
                            variante="secundario"
                            disabled={pagina === 1}
                            onClick={() => definirPagina(p => p - 1)}
                            className="bg-white border-slate-100 hover:border-eletrico/20 hover:text-eletrico shadow-sm w-11 h-11 p-0 flex items-center justify-center rounded-2xl transition-all"
                        >
                            <ChevronLeft size={20} strokeWidth={3} />
                        </Botao>
                        <Botao
                            variante="secundario"
                            disabled={pagina === totalPaginas}
                            onClick={() => definirPagina(p => p + 1)}
                            className="bg-white border-slate-100 hover:border-eletrico/20 hover:text-eletrico shadow-sm w-11 h-11 p-0 flex items-center justify-center rounded-2xl transition-all"
                        >
                            <ChevronRight size={20} strokeWidth={3} />
                        </Botao>
                    </div>
                </div>
            </CartaoConteudo>

            {logSelecionado && (
                <ModalUniversal
                    titulo="Detalhes da Atividade"
                    subtitulo="Informações detalhadas sobre esta ação realizada no sistema"
                    icone={Terminal}
                    aoFechar={() => definirLogSelecionado(null)}
                    tamanho="lg"
                >
                    <div className="space-y-6 pb-6 pt-2">
                        {/* Header do Modal */}
                        <div className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400">
                                    <Fingerprint size={28} strokeWidth={1.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ID do Rastro</span>
                                    <span className="font-mono text-xs text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                        {logSelecionado.id}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Registro Temporal</span>
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                                    <Clock size={14} className="text-eletrico" />
                                    <span className="text-xs font-bold text-slate-700">
                                        {format(new Date(logSelecionado.criado_em || logSelecionado.criado_at || logSelecionado.created_at || logSelecionado.data_criacao || logSelecionado.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Comparação de Dados */}
                        {(() => {
                            let antStr = "// Nenhum dado anterior";
                            let novStr = "// Sem alterações";

                            try {
                                const brutoAnt = logSelecionado.dados_anteriores || logSelecionado.dado_anterior || logSelecionado.anterior || logSelecionado.estado_anterior;
                                let dadosAnt = brutoAnt && typeof brutoAnt === 'string' ? JSON.parse(brutoAnt) : brutoAnt;

                                const brutoNov = logSelecionado.dados_novos || logSelecionado.dado_novo || logSelecionado.novo || logSelecionado.estado_novo;
                                let dadosNov = brutoNov && typeof brutoNov === 'string' ? JSON.parse(brutoNov) : brutoNov;

                                if (mostrarRastroCompleto) {
                                    // Mostra tudo que tem dentro das caixas sem realizar Diff
                                    antStr = dadosAnt && Object.keys(dadosAnt).length > 0 ? JSON.stringify(dadosAnt, null, 2) : String(dadosAnt || "// Nenhum dado anterior");
                                    novStr = dadosNov && Object.keys(dadosNov).length > 0 ? JSON.stringify(dadosNov, null, 2) : String(dadosNov || "// Sem dados novos");
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

                                    antStr = Object.keys(diffAnterior).length > 0 ? JSON.stringify(diffAnterior, null, 2) : "// Nenhuma propriedade alterada";
                                    novStr = Object.keys(diffNovo).length > 0 ? JSON.stringify(diffNovo, null, 2) : "// Nenhuma propriedade alterada";
                                }
                            } catch (e) {
                                antStr = String(logSelecionado.dados_anteriores || logSelecionado.dado_anterior || "// Dados corrompidos");
                                novStr = String(logSelecionado.dados_novos || logSelecionado.dado_novo || "// Sem dados novos");
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                            Estado Anterior {!mostrarRastroCompleto && <span className="opacity-50 lowercase tracking-normal font-medium">(apenas o que mudou)</span>}
                                        </span>
                                        <div className="bg-slate-900 rounded-xl p-6 min-h-[250px] border border-slate-800 shadow-lg overflow-hidden flex flex-col">
                                            <pre className="text-[11px] font-mono text-rose-300/80 leading-relaxed whitespace-pre-wrap overflow-auto custom-scrollbar flex-1">
                                                {antStr}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                            Estado Novo {!mostrarRastroCompleto && <span className="opacity-50 lowercase tracking-normal font-medium">(apenas o que mudou)</span>}
                                        </span>
                                        <div className="bg-slate-900 rounded-xl p-6 min-h-[250px] border border-slate-800 shadow-lg overflow-hidden flex flex-col">
                                            <pre className="text-[11px] font-mono text-emerald-300/80 leading-relaxed whitespace-pre-wrap overflow-auto custom-scrollbar flex-1">
                                                {novStr}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}


                        {/* Ações e Rastro Completo (Fallback) */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <button
                                    onClick={() => definirMostrarRastroCompleto(!mostrarRastroCompleto)}
                                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] cursor-pointer hover:opacity-80 transition-opacity list-none"
                                    style={{ color: mostrarRastroCompleto ? '#2B59FF' : '#cbd5e1' }}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${mostrarRastroCompleto ? 'bg-eletrico animate-pulse' : 'bg-slate-200'}`}></div>
                                    {mostrarRastroCompleto ? 'VER APENAS O QUE MUDOU' : 'VER OBJETO DE RASTRO COMPLETO'}
                                </button>
                            </div>

                            <Botao
                                variante="secundario"
                                icone={ChevronLeft}
                                onClick={() => { definirLogSelecionado(null); definirMostrarRastroCompleto(false); }}
                                className="shrink-0 font-bold text-[11px] uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600 border-none px-6 py-3"
                            >
                                Fechar Detalhes
                            </Botao>
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

