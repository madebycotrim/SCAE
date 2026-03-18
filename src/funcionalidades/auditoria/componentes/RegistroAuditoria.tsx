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
    Fingerprint
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { mascararEmail } from '@/compartilhado/utils/formatar';
import { usarTermoBusca } from '@/compartilhado/contextos/ContextoBuscaGlobal';

import ModalUniversal from '@/compartilhado/componentes/ModalUniversal';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';

export default function RegistroAuditoria() {
    const { podeVerLogs, ehAdmin } = usarPermissoes();
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
    const [confirmacao, definirConfirmacao] = useState<{ aberto: boolean, acao: () => void, titulo: string, mensagem: string, variante?: 'perigoso' | 'padrao' } | null>(null);

    const LOGS_PER_PAGE = 15;
    const EH_ADMIN_SUPREMO = ehAdmin;

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
            variante: 'perigoso',
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
    const logsFiltrados = logs.filter((l: any) => {
        // Regra de privacidade: logs do madebycotrim são invisíveis para outros usuários
        const ehMadeByCotrim = l.usuario_email?.toLowerCase().includes('madebycotrim');
        const euSouMadeByCotrim = usuarioAtual?.email?.toLowerCase().includes('madebycotrim');
        
        if (ehMadeByCotrim && !euSouMadeByCotrim) return false;

        return (
            !busca.trim() ||
            l.acao?.toLowerCase().includes(busca.toLowerCase()) ||
            l.usuario_email?.toLowerCase().includes(busca.toLowerCase()) ||
            l.entidade_tipo?.toLowerCase().includes(busca.toLowerCase()) ||
            (mapaUsuarios[l.usuario_email] || '').toLowerCase().includes(busca.toLowerCase())
        );
    });

    const totalPaginas = Math.ceil(logsFiltrados.length / LOGS_PER_PAGE) || 1;
    const logsPaginados = logsFiltrados.slice((pagina - 1) * LOGS_PER_PAGE, pagina * LOGS_PER_PAGE);

    const StatusBadge = ({ action }: { action: string }) => {
        const act = action?.toUpperCase() || '';

        let colorClasses = 'text-slate-500 bg-slate-400/10';
        if (act.includes('SUCESSO') || act.includes('CRIAR') || act.includes('LOGIN')) colorClasses = 'text-emerald-600 bg-emerald-500/10';
        if (act.includes('ERRO') || act.includes('DELETAR') || act.includes('EXCLUIR')) colorClasses = 'text-rose-600 bg-rose-500/10';
        if (act.includes('ATUALIZAR') || act.includes('EDITAR')) colorClasses = 'text-amber-600 bg-amber-500/10';

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${colorClasses}`}>
                {action}
            </span>
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
            titulo="Histórico de Atividades"
            subtitulo="Veja tudo o que foi feito no sistema para garantir a segurança dos dados"
            acoes={<Botao variante="secundario" tamanho="sm" icone={RefreshCw} loading={carregando} onClick={carregarLogs}>Sincronizar</Botao>}
            carregando={carregando}
        >

            <CartaoConteudo className="flex flex-col h-[calc(100vh-165px)] overflow-hidden bg-white border-slate-100 shadow-[0_15px_60px_rgba(0,0,0,0.03)] rounded-2xl">
                {/* Table Area */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                            <tr>
                                <th scope="col" className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[180px] text-center">Ação</th>
                                <th scope="col" className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Responsável</th>
                                <th scope="col" className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-[140px]">Contexto</th>
                                <th scope="col" className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-[200px]">Data e Hora</th>
                                <th scope="col" className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-[100px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {carregandoInicial ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-fade-in">
                                        <td className="py-4 px-8"><Esqueleto className="w-24 h-5 rounded-lg" /></td>
                                        <td className="py-4 px-8">
                                            <div className="flex items-center gap-3">
                                                <Esqueleto className="w-9 h-9 rounded-2xl" />
                                                <div className="space-y-2">
                                                    <Esqueleto className="w-32 h-3" />
                                                    <Esqueleto className="w-24 h-2 opacity-60" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-8 text-center"><Esqueleto className="w-16 h-5 mx-auto rounded-2xl" /></td>
                                        <td className="py-4 px-8"><Esqueleto className="w-32 h-4" /></td>
                                        <td className="py-4 px-8 text-right"><Esqueleto className="w-24 h-8 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : logsPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-40 grayscale gap-4">
                                            <Activity size={48} className="text-slate-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhuma atividade registrada no momento</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logsPaginados.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-slate-50/40 transition-all group/row border-b border-slate-50 last:border-0">
                                        <td className="px-8 py-5 align-middle text-center">
                                            <div className="flex items-center justify-center">
                                                <StatusBadge action={log.acao} />
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 shadow-inner">
                                                    <User size={16} strokeWidth={2.5} />
                                                </div>
                                                <div className="flex flex-col text-left truncate">
                                                    <span className="text-[13px] font-bold text-slate-700 leading-tight">
                                                        {mapaUsuarios[log.usuario_email] || log.usuario_email.split('@')[0]}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        {mascararEmail(log.usuario_email)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 align-middle text-center">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                                {log.entidade_tipo}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 align-middle text-center">
                                            { (log.criado_em || log.criado_at || log.created_at || log.data_criacao || log.timestamp) ? (
                                                <div className="flex flex-col gap-0.5 leading-none text-center">
                                                    <span className="text-[13px] text-slate-600 font-bold whitespace-nowrap">
                                                        {format(new Date(log.criado_em || log.criado_at || log.created_at || log.data_criacao || log.timestamp), "dd/MM/yyyy", { locale: ptBR })}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                                                        {format(new Date(log.criado_em || log.criado_at || log.created_at || log.data_criacao || log.timestamp), "HH:mm:ss")}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-300 uppercase font-black tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg">Sem Data</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 align-middle text-center">
                                            <div className="flex justify-center gap-1.5 transition-all" onClick={(e) => e.stopPropagation()}>
                                                <Botao
                                                    variante="ghost"
                                                    tamanho="sm"
                                                    icone={Eye}
                                                    onClick={() => { definirLogSelecionado(log); definirMostrarRastroCompleto(false); }}
                                                    className="text-slate-400 hover:text-indigo-600 hover:bg-white shadow-sm rounded-lg w-9 h-9 p-0 border border-slate-200 transition-all"
                                                />

                                                {EH_ADMIN_SUPREMO && (
                                                    <Botao
                                                        variante="ghost"
                                                        tamanho="sm"
                                                        icone={Trash2}
                                                        onClick={() => excluirLog(log.id)}
                                                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm rounded-lg w-9 h-9 p-0 border border-slate-200 transition-all"
                                                    />
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
                            <span className="text-[12px] font-black text-indigo-600 uppercase tracking-widest leading-none">{pagina} <span className="text-slate-200 mx-2">/</span> {totalPaginas}</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo: {logsFiltrados.length} registros</span>
                    </div>

                    <div className="flex gap-3">
                        <Botao
                            variante="secundario"
                            disabled={pagina === 1}
                            onClick={() => definirPagina(p => p - 1)}
                            className="bg-white border-slate-100 hover:border-indigo-100 hover:text-indigo-600 shadow-sm w-11 h-11 p-0 flex items-center justify-center rounded-2xl transition-all"
                        >
                            <ChevronLeft size={20} strokeWidth={3} />
                        </Botao>
                        <Botao
                            variante="secundario"
                            disabled={pagina === totalPaginas}
                            onClick={() => definirPagina(p => p + 1)}
                            className="bg-white border-slate-100 hover:border-indigo-100 hover:text-indigo-600 shadow-sm w-11 h-11 p-0 flex items-center justify-center rounded-2xl transition-all"
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
                                    <Clock size={14} className="text-indigo-500" />
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
                                    style={{ color: mostrarRastroCompleto ? '#818cf8' : '#cbd5e1' }}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${mostrarRastroCompleto ? 'bg-indigo-400 animate-pulse' : 'bg-slate-200'}`}></div>
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

