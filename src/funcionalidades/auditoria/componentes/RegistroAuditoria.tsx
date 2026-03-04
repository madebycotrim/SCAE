import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { usarPermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@compartilhado/componentes/UI';
import {
    Activity,
    Search,
    Download,
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
    Fingerprint
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import ModalUniversal from '@compartilhado/componentes/ModalUniversal';

export default function RegistroAuditoria() {
    const { podeVerLogs, ehAdmin } = usarPermissoes();
    const [logs, definirLogs] = useState([]);
    const [busca, definirBusca] = useState('');
    const [pagina, definirPagina] = useState(1);
    const [logSelecionado, definirLogSelecionado] = useState(null);
    const [carregando, definirCarregando] = useState(false);

    const LOGS_PER_PAGE = 15;
    const EH_ADMIN_SUPREMO = ehAdmin;

    useEffect(() => {
        carregarLogs();
    }, []);

    const carregarLogs = async () => {
        try {
            definirCarregando(true);
            const todosLogs = await bancoLocal.listarLogs();

            // Ordenar por data (mais recente primeiro)
            todosLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            definirLogs(todosLogs);
        } catch (e) {
            console.error(e);
            toast.error("Falha ao sincronizar logs de auditoria.");
        } finally {
            definirCarregando(false);
        }
    };

    const excluirLog = async (id: string) => {
        if (!EH_ADMIN_SUPREMO) return;

        if (!window.confirm("A exclusão de logs de auditoria compromete a rastreabilidade legal (Marco Civil). Deseja continuar?")) {
            return;
        }

        try {
            const banco = await bancoLocal.iniciarBanco();
            await banco.delete('logs_auditoria', id);

            definirLogs(current => current.filter(l => l.id !== id));
            toast.success("Registro de trilha removido");

            if (logSelecionado?.id === id) definirLogSelecionado(null);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao remover registro.");
        }
    };

    const logsFiltrados = logs.filter((l: any) =>
        l.acao?.toLowerCase().includes(busca.toLowerCase()) ||
        l.usuario_email?.toLowerCase().includes(busca.toLowerCase()) ||
        l.entidade_tipo?.toLowerCase().includes(busca.toLowerCase())
    );

    const totalPaginas = Math.ceil(logsFiltrados.length / LOGS_PER_PAGE) || 1;
    const logsPaginados = logsFiltrados.slice((pagina - 1) * LOGS_PER_PAGE, pagina * LOGS_PER_PAGE);

    const StatusBadge = ({ action }: { action: string }) => {
        const act = action?.toUpperCase() || '';

        let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        if (act.includes('SUCESSO') || act.includes('CRIAR') || act.includes('LOGIN')) colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-900/5';
        if (act.includes('ERRO') || act.includes('DELETAR') || act.includes('EXCLUIR')) colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm shadow-rose-900/5';
        if (act.includes('ATUALIZAR') || act.includes('EDITAR')) colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-900/5';
        if (act.includes('LOGOUT')) colorClasses = 'bg-slate-100 text-slate-500 border-slate-200';

        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all hover:scale-105 ${colorClasses}`}>
                {action}
            </span>
        );
    };

    if (!podeVerLogs) {
        return (
            <LayoutAdministrativo titulo="Auditoria Local" subtitulo="Rastreabilidade e trilha de segurança" acoes={null}>
                <div className="flex flex-col items-center justify-center h-96 gap-4 text-slate-400 opacity-50 grayscale">
                    <ShieldOff size={64} strokeWidth={1} />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">Acesso restrito ao comitê de segurança</p>
                </div>
            </LayoutAdministrativo>
        );
    }

    return (
        <LayoutAdministrativo
            titulo="Trilha de Auditoria"
            subtitulo="Monitoramento de transações e logs imutáveis da unidade"
            acoes={<Botao variante="secundario" tamanho="md" icone={RefreshCw} loading={carregando} onClick={carregarLogs}>Sincronizar</Botao>}
        >
            <BarraFiltro className="bg-slate-50 border-slate-200/60 shadow-sm">
                <InputBusca
                    icone={Search}
                    placeholder="Filtrar por transação, usuário ou payload..."
                    value={busca}
                    onChange={(e) => { definirBusca(e.target.value); definirPagina(1); }}
                    className="md:max-w-md"
                />

                <Botao
                    variante="ghost"
                    tamanho="md"
                    icone={Download}
                    className="hidden md:flex ml-auto font-black text-[10px] tracking-widest text-slate-500"
                >
                    EXPORTAR DATASET (CSV)
                </Botao>
            </BarraFiltro>

            <CartaoConteudo className="flex flex-col h-[calc(100vh-320px)] overflow-hidden bg-white border-slate-200 shadow-xl">
                {/* Table Area */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Procedimento / Ação</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operador (Email)</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Entidade Afetada</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cronologia (UTC-3)</th>
                                <th className="px-8 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {carregando ? (
                                [...Array(8)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="py-6 px-8 h-12 bg-slate-50/30"></td>
                                    </tr>
                                ))
                            ) : logsPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-40 grayscale gap-4">
                                            <Activity size={48} className="text-slate-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhum registro de auditoria em cache</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logsPaginados.map((log) => (
                                <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-8 py-4">
                                        <StatusBadge action={log.acao} />
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shadow-inner">
                                                <User size={14} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors tracking-tight">{log.usuario_email}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shadow-sm">
                                            {log.entidade_tipo}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-2.5 text-xs font-mono font-black text-slate-400 group-hover:text-slate-600 transition-colors">
                                            <Clock size={12} className="text-slate-300" />
                                            {log.timestamp ? format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss") : '-'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Botao
                                                variante="ghost"
                                                tamanho="sm"
                                                icone={Eye}
                                                onClick={() => definirLogSelecionado(log)}
                                                title="Analisar Payload"
                                                className="hover:text-indigo-600"
                                            />

                                            {EH_ADMIN_SUPREMO && (
                                                <Botao
                                                    variante="ghost"
                                                    tamanho="sm"
                                                    icone={Trash2}
                                                    onClick={() => excluirLog(log.id)}
                                                    title="Excluir (Risco de Compliance)"
                                                    className="hover:text-rose-600"
                                                />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination Premium */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Página</span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">{pagina} de {totalPaginas}</span>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Dataset Final: {logsFiltrados.length} entradas</span>
                    </div>

                    <div className="flex gap-3">
                        <Botao
                            variante="secundario"
                            disabled={pagina === 1}
                            onClick={() => definirPagina(p => p - 1)}
                            className="bg-white hover:shadow-md transition-shadow"
                            tamanho="sm"
                        >
                            <ChevronLeft size={16} />
                        </Botao>
                        <Botao
                            variante="secundario"
                            disabled={pagina === totalPaginas}
                            onClick={() => definirPagina(p => p + 1)}
                            className="bg-white hover:shadow-md transition-shadow"
                            tamanho="sm"
                        >
                            <ChevronRight size={16} />
                        </Botao>
                    </div>
                </div>
            </CartaoConteudo>

            {/* Modal Detalhes JSON High-Tech */}
            {logSelecionado && (
                <ModalUniversal
                    titulo="Análise de Transação"
                    subtitulo="Inspeção profunda de metadados e payload imutável"
                    icone={Terminal}
                    aoFechar={() => definirLogSelecionado(null)}
                    tamanho="lg"
                >
                    <div className="space-y-8 pb-4">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl">
                                <p className="text-[9px] text-indigo-400 uppercase font-black tracking-[0.2em] mb-2">Fingerprint (Hex)</p>
                                <p className="font-mono text-[10px] text-slate-400 font-bold truncate leading-relaxed" title={logSelecionado.id}>
                                    {logSelecionado.id}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl">
                                <p className="text-[9px] text-emerald-400 uppercase font-black tracking-[0.2em] mb-2">Selo Temporal</p>
                                <p className="font-mono text-xs text-slate-400 font-bold leading-relaxed">
                                    {logSelecionado.timestamp ? format(new Date(logSelecionado.timestamp), "dd/MM/yyyy HH:mm:ss") : '-'}
                                </p>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                                        <Code size={18} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Metadata / Payload Object</span>
                                </div>
                                <span className="text-[8px] font-black bg-slate-900 text-indigo-300 px-3 py-1 rounded-full border border-slate-700 uppercase tracking-[0.2em] shadow-lg">
                                    UTF-8 Encoded
                                </span>
                            </div>
                            <div className="bg-slate-950 rounded-[2.5rem] p-8 overflow-x-auto border border-slate-900 shadow-2xl max-h-[400px] overflow-y-auto custom-scrollbar group relative">
                                <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-100 transition-opacity">
                                    <Fingerprint className="text-indigo-500" size={40} strokeWidth={1} />
                                </div>
                                <pre className="text-[11px] font-mono text-indigo-300/90 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
                                    {JSON.stringify(logSelecionado, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <Botao
                            variante="secundario"
                            fullWidth
                            tamanho="lg"
                            onClick={() => definirLogSelecionado(null)}
                        >
                            Encerrar Inspeção
                        </Botao>
                    </div>
                </ModalUniversal>
            )}
        </LayoutAdministrativo>
    );
}
