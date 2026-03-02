import { useState } from 'react';
import { FileText, Search, Filter } from 'lucide-react';

interface LogGlobalMock {
    id: string;
    timestamp: string;
    quem: string;
    tenantSlug: string;
    acaoDescricao: string;
    gravidade: 'INFO' | 'WARN' | 'CRITICAL';
}

const mockLogs: LogGlobalMock[] = [
    { id: '1', timestamp: '28/02 18:05:12', quem: 'AGM: root@scae.com', tenantSlug: 'GLOBAL', acaoDescricao: 'Criação de novo Tenant: CEF 12 Ceilândia', gravidade: 'INFO' },
    { id: '2', timestamp: '28/02 17:45:00', quem: 'SISTEMA', tenantSlug: 'cem03-taguatinga', acaoDescricao: 'Tentativa de quebra de JWT bloqueada (IP: 189.44.xx.xx)', gravidade: 'CRITICAL' },
    { id: '3', timestamp: '28/02 14:10:00', quem: 'diretora@gmail.com', tenantSlug: 'cem03-taguatinga', acaoDescricao: 'Exportação massiva de relatório de alunos (.CSV)', gravidade: 'WARN' },
];

export function PaginaLogsAGM() {
    const [busca, definirBusca] = useState('');
    const [logs] = useState<LogGlobalMock[]>(mockLogs);

    const filtrados = logs.filter(l => l.quem.toLowerCase().includes(busca.toLowerCase()) || l.acaoDescricao.toLowerCase().includes(busca.toLowerCase()) || l.tenantSlug.toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Monitor de Eventos / Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Audit Trail Master</p>
                        <h2 className="text-2xl font-bold text-white">Logs do Sistema</h2>
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm">
                    <Filter size={16} />
                    Filtros Avançados
                </button>
            </div>

            {/* Hub de Busca */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Pesquisar por autor, ação ou tenant..."
                        value={busca}
                        onChange={(e) => definirBusca(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-500 transition-shadow"
                    />
                </div>
            </div>

            {/* Ledger de Eventos (Tabela SaaS) */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Origem (Tenant)</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Operador</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Evento</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Severidade</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700 text-sm">
                            {filtrados.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-slate-300 font-mono">
                                            {log.timestamp}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {log.tenantSlug === 'GLOBAL' ? (
                                            <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-md text-xs font-medium">GLOBAL</span>
                                        ) : (
                                            <span className="text-slate-400 font-mono text-xs">{log.tenantSlug}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-medium text-white">
                                            {log.quem}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-md truncate">
                                        <span className={`font-mono ${log.gravidade === 'CRITICAL' ? 'text-rose-400' : log.gravidade === 'WARN' ? 'text-amber-400' : 'text-slate-300'}`}>
                                            {log.acaoDescricao}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${log.gravidade === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400' :
                                                log.gravidade === 'WARN' ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-slate-700 text-slate-300'
                                            }`}>
                                            {log.gravidade}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filtrados.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-slate-600">
                                                <FileText size={20} />
                                            </div>
                                            <p className="text-sm font-medium text-slate-400">Nenhum evento encontrado no período.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
