import { useState, useEffect } from 'react';
import LayoutAdministrativo from '../componentes/LayoutAdministrativo';
import { bancoLocal } from '../servicos/bancoLocal';
import { useAutenticacao } from '../contexts/ContextoAutenticacao';
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
    RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import ModalUniversal from '../componentes/ModalUniversal';

export default function Logs() {
    const { usuarioAtual } = useAutenticacao();
    const [logs, definirLogs] = useState([]);
    const [busca, definirBusca] = useState('');
    const [pagina, definirPagina] = useState(1);
    const [logSelecionado, definirLogSelecionado] = useState(null);

    const LOGS_PER_PAGE = 15;
    const EH_ADMIN_SUPREMO = usuarioAtual?.email === 'madebycotrim@gmail.com';

    useEffect(() => {
        carregarLogs();
    }, []);

    const carregarLogs = async () => {
        try {
            const todosLogs = await bancoLocal.listarLogs();

            // Ordenar por data (mais recente primeiro)
            todosLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            definirLogs(todosLogs);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar logs.");
        }
    };

    const excluirLog = async (id) => {
        if (!EH_ADMIN_SUPREMO) return;

        if (!window.confirm("Você tem certeza que deseja apagar este registro de auditoria? Isso não é recomendado.")) {
            return;
        }

        try {
            const banco = await bancoLocal.iniciarBanco();
            await banco.delete('logs_auditoria', id);

            // Atualizar lista
            definirLogs(current => current.filter(l => l.id !== id));
            toast.success("Log removido.");

            if (logSelecionado?.id === id) definirLogSelecionado(null);

        } catch (e) {
            console.error(e);
            toast.error("Erro ao excluir log.");
        }
    };

    const logsFiltrados = logs.filter(l =>
        l.acao?.toLowerCase().includes(busca.toLowerCase()) ||
        l.usuario_email?.toLowerCase().includes(busca.toLowerCase()) ||
        l.entidade_tipo?.toLowerCase().includes(busca.toLowerCase())
    );

    const totalPaginas = Math.ceil(logsFiltrados.length / LOGS_PER_PAGE) || 1;
    const logsPaginados = logsFiltrados.slice((pagina - 1) * LOGS_PER_PAGE, pagina * LOGS_PER_PAGE);

    const StatusBadge = ({ action }) => {
        let color = 'slate';
        const act = action?.toUpperCase() || '';

        if (act.includes('SUCESSO') || act.includes('CRIAR') || act.includes('LOGIN')) color = 'emerald';
        if (act.includes('ERRO') || act.includes('DELETAR') || act.includes('EXCLUIR')) color = 'rose';
        if (act.includes('ATUALIZAR') || act.includes('EDITAR')) color = 'amber';
        if (act.includes('LOGOUT')) color = 'gray';

        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-${color}-50 text-${color}-700 border border-${color}-200`}>
                {action}
            </span>
        );
    };

    return (
        <LayoutAdministrativo titulo="Auditoria do Sistema" subtitulo="Rastreabilidade e segurança">

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">

                {/* Visual Toolbar */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar logs por ação ou usuário..."
                            value={busca}
                            onChange={(e) => definirBusca(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={carregarLogs}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                            <RefreshCw size={16} /> Atualizar
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                            <Download size={16} /> Exportar CSV
                        </button>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entidade</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logsPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-400 font-medium">
                                        <div className="flex flex-col items-center justify-center opacity-50">
                                            <Activity size={40} className="mb-2" />
                                            <span>Nenhum registro de auditoria encontrado.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logsPaginados.map((log) => (
                                <tr key={log.id} className="hover:bg-indigo-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-indigo-600 transition-colors shadow-sm">
                                                <Activity size={16} />
                                            </div>
                                            <StatusBadge action={log.acao} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-slate-300 group-hover:text-indigo-400" />
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{log.usuario_email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-lg text-slate-500 border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                            {log.entidade_tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs font-mono font-medium text-slate-500">
                                            <Clock size={12} className="text-slate-300" />
                                            {log.timestamp ? format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss") : '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => definirLogSelecionado(log)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-lg transition-all shadow-sm hover:shadow-md"
                                            title="Ver Detalhes"
                                        >
                                            <Eye size={18} />
                                        </button>

                                        {EH_ADMIN_SUPREMO && (
                                            <button
                                                onClick={() => excluirLog(log.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-rose-100 rounded-lg transition-all shadow-sm hover:shadow-md"
                                                title="Excluir Registro (Admin Supremo)"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                        Página {pagina} de {totalPaginas} ({logsFiltrados.length} registros)
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={pagina === 1}
                            onClick={() => definirPagina(p => p - 1)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            disabled={pagina === totalPaginas}
                            onClick={() => definirPagina(p => p + 1)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Detalhes JSON */}
            {logSelecionado && (
                <ModalUniversal
                    titulo="Detalhes do Registro"
                    fechavel
                    aoFechar={() => definirLogSelecionado(null)}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">ID do Evento</p>
                                <p className="font-mono text-xs text-slate-700 font-bold truncate" title={logSelecionado.id}>{logSelecionado.id}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Timestamp</p>
                                <p className="font-mono text-xs text-slate-700 font-bold truncate">
                                    {logSelecionado.timestamp ? format(new Date(logSelecionado.timestamp), "dd/MM/yyyy HH:mm:ss") : '-'}
                                </p>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Code size={16} className="text-indigo-500" />
                                <span className="text-sm font-bold text-slate-700">Dados do Evento (JSON)</span>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto border border-slate-800 shadow-inner max-h-60 overflow-y-auto">
                                <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
                                    {JSON.stringify(logSelecionado, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                </ModalUniversal>
            )}

        </LayoutAdministrativo>
    );
}
