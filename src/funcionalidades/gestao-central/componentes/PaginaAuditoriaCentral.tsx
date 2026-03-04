import { useState, useEffect } from 'react';
import { FileText, Search, Filter, Loader2, AlertTriangle, Clock, ShieldAlert, Info, AlertOctagon } from 'lucide-react';
import { api } from '@compartilhado/servicos/api';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@compartilhado/componentes/UI';

interface LogGlobal {
    id: string;
    timestamp: string;
    quem: string;
    escolaslug: string;
    acaoDescricao: string;
    gravidade: 'INFO' | 'WARN' | 'CRITICAL';
}

export function PaginaAuditoriaCentral() {
    const [busca, definirBusca] = useState('');
    const [logs, definirLogs] = useState<LogGlobal[]>([]);
    const [carregando, definirCarregando] = useState(true);
    const [erro, definirErro] = useState<string | null>(null);

    useEffect(() => {
        const buscarLogs = async () => {
            try {
                definirCarregando(true);
                const resposta = await api.obter<{ dados: LogGlobal[] }>('/central/logs');
                definirLogs(resposta.dados);
            } catch (err: any) {
                console.error('Erro ao buscar logs:', err);
                definirErro(err.message || 'Falha ao carregar registros de auditoria.');
            } finally {
                definirCarregando(false);
            }
        };

        buscarLogs();
    }, []);

    const filtrados = logs.filter(l =>
        l.quem.toLowerCase().includes(busca.toLowerCase()) ||
        l.acaoDescricao.toLowerCase().includes(busca.toLowerCase()) ||
        l.escolaslug?.toLowerCase().includes(busca.toLowerCase())
    );

    if (carregando) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-6">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Lendo Ledger de Eventos Imutável...</p>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="bg-rose-500/5 border border-rose-500/20 p-12 rounded-2xl flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 shadow-lg shadow-rose-900/10">
                    <AlertOctagon size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Falha no Subsistema de Auditoria</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{erro}</p>
                </div>
                <Botao variante="perigo" onClick={() => window.location.reload()}>Recarregar Trail</Botao>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header Técnico */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400 shadow-lg">
                        <FileText size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Global Audit Trail</p>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Logs do Ecossistema</h2>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="px-5 py-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex items-center gap-3">
                        <Clock size={16} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tempo Real</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                    </div>
                </div>
            </div>

            {/* Barra de Busca / Filtros */}
            <BarraFiltro className="bg-slate-900 border-slate-800 shadow-xl">
                <InputBusca
                    icone={Search}
                    placeholder="Pesquisar por autor, ação descritiva ou identificador de escola..."
                    value={busca}
                    onChange={(e) => definirBusca(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10 text-white"
                />
            </BarraFiltro>

            {/* Matrix de Dados (Tabela) */}
            <CartaoConteudo className="bg-slate-900 border-slate-800 shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp (UTC-3)</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Origem</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operador</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Evento / Transação</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Nível</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-50 grayscale">
                                            <FileText size={48} className="text-slate-600" />
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Nenhum evento registrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtrados.map((log) => (
                                    <tr key={log.id} className="hover:bg-indigo-500/5 transition-colors group">
                                        <td className="py-5 px-8">
                                            <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-indigo-300 transition-colors">
                                                {new Date(log.timestamp).toLocaleString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8">
                                            {log.escolaslug === 'GLOBAL' || !log.escolaslug ? (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">GLOBAL</span>
                                            ) : (
                                                <span className="text-xs font-mono font-bold text-slate-500 uppercase">{log.escolaslug}</span>
                                            )}
                                        </td>
                                        <td className="py-5 px-8">
                                            <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                                                {log.quem}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="max-w-md truncate">
                                                <span className={`text-xs font-mono font-bold ${log.gravidade === 'CRITICAL' ? 'text-rose-400' : log.gravidade === 'WARN' ? 'text-amber-400' : 'text-slate-400'}`}>
                                                    {log.acaoDescricao}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            <BadgeGravidade gravidade={log.gravidade} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CartaoConteudo>
        </div>
    );
}

function BadgeGravidade({ gravidade }: { gravidade: 'INFO' | 'WARN' | 'CRITICAL' }) {
    if (gravidade === 'CRITICAL') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert size={12} /> CRITICAL
            </span>
        );
    }
    if (gravidade === 'WARN') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={12} /> WARN
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
            <Info size={12} /> INFO
        </span>
    );
}
