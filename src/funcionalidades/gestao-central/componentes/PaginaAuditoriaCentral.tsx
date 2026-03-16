import { useState, useEffect } from 'react';
import { FileText, Search, Filter, Loader2, AlertTriangle, Clock, ShieldAlert, Info, AlertOctagon } from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@/compartilhado/componentes/UI';

import { mascararEmail } from '@/compartilhado/utils/formatar';

interface LogGlobal {
    id: string;
    timestamp: string;
    usuario_email: string;
    usuario_nome?: string;
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
        l.usuario_email.toLowerCase().includes(busca.toLowerCase()) ||
        (l.usuario_nome && l.usuario_nome.toLowerCase().includes(busca.toLowerCase())) ||
        l.acaoDescricao.toLowerCase().includes(busca.toLowerCase()) ||
        l.escolaslug?.toLowerCase().includes(busca.toLowerCase())
    );

    if (carregando) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-slate-600 gap-6">
                <div className="w-16 h-16 border-4 border-slate-700/30 border-t-slate-400 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Lendo registros...</p>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="bg-slate-800/60 border border-slate-800 p-12 rounded-2xl flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-slate-800/40 rounded-2xl flex items-center justify-center text-slate-400 shadow-lg">
                    <AlertOctagon size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2 uppercase tracking-tight">Erro na Auditoria</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{erro}</p>
                </div>
                <Botao variante="perigo" onClick={() => window.location.reload()}>Recarregar</Botao>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-800/60 border border-slate-800/80 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-700/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-700/80 text-slate-400 shadow-lg">
                        <FileText size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Registro de Eventos</p>
                        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Logs do Ecossistema</h2>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="px-5 py-3 bg-slate-800/50 rounded-2xl border border-slate-700/80 flex items-center gap-3">
                        <Clock size={16} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Real</span>
                        <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse"></div>
                    </div>
                </div>
            </div>

            {/* Busca */}
            <BarraFiltro className="bg-slate-800/60 border-slate-800/80 shadow-xl">
                <InputBusca
                    icone={Search}
                    placeholder="Pesquisar por autor, ação ou instituição..."
                    value={busca}
                    onChange={(e) => definirBusca(e.target.value)}
                    className="bg-slate-800/50 border-slate-800 focus:border-slate-700 focus:ring-slate-700/20 text-white"
                />
            </BarraFiltro>

            {/* Tabela */}
            <CartaoConteudo className="bg-slate-800/60 border-slate-800/80 shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-800">
                                <th className="py-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Data (UTC-3)</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Origem</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Operador</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Evento</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Gravidade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-50 grayscale">
                                            <FileText size={48} className="text-slate-700" />
                                            <p className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Nenhum evento</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtrados.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors group">
                                        <td className="py-5 px-8">
                                            <span className="text-xs font-mono font-bold text-slate-600 group-hover:text-slate-400 transition-colors">
                                                {new Date(log.timestamp).toLocaleString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8">
                                            {log.escolaslug === 'GLOBAL' || !log.escolaslug ? (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800/30 px-2 py-1 rounded border border-slate-800">GLOBAL</span>
                                            ) : (
                                                <span className="text-xs font-mono font-bold text-slate-600 uppercase">{log.escolaslug}</span>
                                            )}
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors uppercase">
                                                    {log.usuario_nome || log.usuario_email.split('@')[0]}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-700 tracking-wider">
                                                    {mascararEmail(log.usuario_email)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="max-w-md truncate">
                                                <span className={`text-xs font-mono font-bold ${log.gravidade === 'CRITICAL' ? 'text-slate-400' : log.gravidade === 'WARN' ? 'text-slate-400' : 'text-slate-600'}`}>
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800/30 border border-slate-800">
                <ShieldAlert size={12} /> Critical
            </span>
        );
    }
    if (gravidade === 'WARN') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800/20 border border-slate-800">
                <AlertTriangle size={12} /> Warn
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 bg-slate-900/30 border border-slate-800">
            <Info size={12} /> Info
        </span>
    );
}
