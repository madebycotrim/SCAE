import { useState, useMemo, useEffect } from 'react';
import type { RegistroAcessoLocal } from '@compartilhado/types/bancoLocal.tipos';
import { usarRiscoAbandono } from '../hooks/usarRiscoAbandono';
import { AlertaRiscoAbandono, StatusRiscoAbandono } from '../types/riscoAbandono.tipos';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@compartilhado/componentes/UI';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Search,
    Clock,
    Zap,
    History,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ArrowRight,
    ShieldAlert
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PainelRiscoAbandono() {
    const {
        alertas,
        carregando,
        processando,
        tratarAlerta,
        rodarMotorRiscoAbandono,
        buscarHistoricoFaltas
    } = usarRiscoAbandono();

    const [pesquisa, definirPesquisa] = useState('');
    const [filtroStatus, definirFiltroStatus] = useState<StatusRiscoAbandono | 'TODOS'>('TODOS');
    const [paginaAtual, definirPaginaAtual] = useState(1);
    const itensPorPagina = 10;

    // Modal state for viewing absences
    const [alertaFaltasAtivo, definirAlertaFaltasAtivo] = useState<AlertaRiscoAbandono | null>(null);
    const [historicoAtivo, definirHistoricoAtivo] = useState<RegistroAcessoLocal[]>([]);
    const [carregandoHistorico, definirCarregandoHistorico] = useState(false);

    useEffect(() => {
        const carregarHistorico = async () => {
            if (alertaFaltasAtivo) {
                definirCarregandoHistorico(true);
                const dados = await buscarHistoricoFaltas(alertaFaltasAtivo.aluno_matricula);
                definirHistoricoAtivo(dados);
                definirCarregandoHistorico(false);
            } else {
                definirHistoricoAtivo([]);
            }
        };
        carregarHistorico();
    }, [alertaFaltasAtivo, buscarHistoricoFaltas]);

    // Dados Filtrados
    const alertasFiltrados = useMemo(() => {
        return alertas.filter(a => {
            const matchNome = a.aluno_nome?.toLowerCase().includes(pesquisa.toLowerCase()) ||
                a.aluno_matricula.includes(pesquisa);
            const matchStatus = filtroStatus === 'TODOS' ? true : a.status === filtroStatus;
            return matchNome && matchStatus;
        });
    }, [alertas, pesquisa, filtroStatus]);

    // Paginação
    const totalPaginas = Math.ceil(alertasFiltrados.length / itensPorPagina) || 1;
    const paginados = alertasFiltrados.slice(
        (paginaAtual - 1) * itensPorPagina,
        paginaAtual * itensPorPagina
    );

    // Métricas Quick Look
    const metricas = {
        total: alertas.length,
        criticos: alertas.filter(a => a.status === 'PENDENTE').length,
        emTratativa: alertas.filter(a => a.status === 'EM_ANALISE').length,
        resolvidos: alertas.filter(a => a.status === 'RESOLVIDO').length
    };

    const AcoesHeader = (
        <Botao
            variante="primario"
            tamanho="lg"
            icone={Zap}
            loading={processando || carregando}
            onClick={rodarMotorRiscoAbandono}
        >
            {processando ? "Processando Algoritmo..." : "Recalcular Evasão"}
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Gestão de Evasão"
            subtitulo="Diagnóstico preventivo de abandono escolar e análise de frequência"
            acoes={AcoesHeader}
        >
            <div className="space-y-8 pb-12">

                {/* Métricas Master Style */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <CardMetrica
                        label="Alertas Totais"
                        valor={metricas.total}
                        icon={<Activity className="text-slate-400" size={24} />}
                        className="bg-white"
                    />
                    <CardMetrica
                        label="Fluxo Crítico"
                        valor={metricas.criticos}
                        icon={<ShieldAlert className="text-rose-500" size={24} />}
                        className="bg-rose-50/30 border-rose-100"
                    />
                    <CardMetrica
                        label="Em Tratativa"
                        valor={metricas.emTratativa}
                        icon={<Clock className="text-amber-500" size={24} />}
                        className="bg-amber-50/30 border-amber-100"
                    />
                    <CardMetrica
                        label="Casos Resolvidos"
                        valor={metricas.resolvidos}
                        icon={<CheckCircle2 className="text-emerald-500" size={24} />}
                        className="bg-emerald-50/30 border-emerald-100"
                    />
                </div>

                {/* Toolbar de Filtros */}
                <BarraFiltro className="bg-slate-50 border-slate-200/60 shadow-sm p-4 rounded-[2rem]">
                    <div className="flex flex-col gap-2.5 flex-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Filtro de Inteligência</label>
                        <InputBusca
                            icone={Search}
                            placeholder="Pesquisar por aluno ou matrícula no radar..."
                            value={pesquisa}
                            onChange={(e) => {
                                definirPesquisa(e.target.value);
                                definirPaginaAtual(1);
                            }}
                            className="w-full h-12 rounded-2xl"
                        />
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap gap-6 items-end">
                        <div className="flex flex-col gap-2.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Status Operacional</label>
                            <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 h-12 shadow-sm">
                                {(['TODOS', 'PENDENTE', 'EM_ANALISE', 'RESOLVIDO'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            definirFiltroStatus(status);
                                            definirPaginaAtual(1);
                                        }}
                                        className={`px-5 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all outline-none flex items-center justify-center ${filtroStatus === status
                                            ? 'bg-slate-900 text-white shadow-md'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                            }`}
                                    >
                                        {status === 'TODOS' ? 'Todos' : status === 'PENDENTE' ? 'Críticos' : status === 'EM_ANALISE' ? 'Análise' : 'Resolvido'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </BarraFiltro>

                {/* Tabela de Alertas SaaS Premium */}
                <CartaoConteudo className="bg-white border-slate-200/60 shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200">
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificação do Aluno</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unidade / Classe</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Diagnóstico (Motivo)</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data do Incidente</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status Operacional</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações de Gestão</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {carregando ? (
                                    [...Array(6)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="py-8 px-8 h-18 bg-slate-50/30"></td>
                                        </tr>
                                    ))
                                ) : paginados.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-24 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 opacity-40 grayscale">
                                                <AlertCircle size={48} className="text-slate-400" />
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Zero instâncias de abandono localizadas</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginados.map((alerta) => (
                                        <tr key={alerta.id} className="hover:bg-indigo-50/20 transition-colors group">
                                            <td className="py-6 px-8">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-slate-900 text-sm uppercase tracking-tight group-hover:text-indigo-700 transition-colors">{alerta.aluno_nome}</span>
                                                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{alerta.aluno_matricula}</span>
                                                </div>
                                            </td>
                                            <td className="py-6 px-8">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 group-hover:bg-white transition-colors uppercase">
                                                    {alerta.turma_nome}
                                                </span>
                                            </td>
                                            <td className="py-6 px-8 max-w-xs overflow-hidden">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></div>
                                                    <p className="text-xs font-bold text-slate-600 truncate group-hover:text-slate-900 transition-colors" title={alerta.motivo}>
                                                        {alerta.motivo}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-6 px-8">
                                                <div className="flex items-center gap-2 text-xs font-mono font-black text-slate-400 group-hover:text-slate-600 transition-colors">
                                                    <Clock size={12} className="text-slate-300" />
                                                    {format(parseISO(alerta.data_criacao), "dd/MM/yyyy", { locale: ptBR })}
                                                </div>
                                            </td>
                                            <td className="py-6 px-8 text-center">
                                                <BadgeStatus status={alerta.status} />
                                            </td>
                                            <td className="py-6 px-8 text-right">
                                                <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                    <select
                                                        value={alerta.status}
                                                        onChange={(e) => tratarAlerta(alerta.id, e.target.value as StatusRiscoAbandono)}
                                                        className="text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 outline-none hover:border-indigo-300 focus:ring-4 focus:ring-indigo-600/5 transition-all cursor-pointer shadow-sm"
                                                    >
                                                        <option value="PENDENTE">Status: Crítico</option>
                                                        <option value="EM_ANALISE">Status: Em Análise</option>
                                                        <option value="RESOLVIDO">Status: Resolvido</option>
                                                    </select>

                                                    <Botao
                                                        variante="ghost"
                                                        tamanho="sm"
                                                        icone={History}
                                                        onClick={() => definirAlertaFaltasAtivo(alerta)}
                                                        title="Dossiê de Frequência"
                                                        className="hover:text-indigo-600 active:scale-95 transition-transform"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CartaoConteudo>

                {/* Paginação Premium */}
                {totalPaginas > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-2">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Página</span>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">{paginaAtual} de {totalPaginas}</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Instâncias pendentes: {metricas.criticos}</span>
                        </div>

                        <div className="flex gap-3">
                            <Botao
                                variante="secundario"
                                onClick={() => definirPaginaAtual(Math.max(1, paginaAtual - 1))}
                                disabled={paginaAtual === 1}
                                tamanho="sm"
                            >
                                <ChevronLeft size={16} />
                            </Botao>
                            <Botao
                                variante="secundario"
                                onClick={() => definirPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                                disabled={paginaAtual === totalPaginas}
                                tamanho="sm"
                            >
                                <ChevronRight size={16} />
                            </Botao>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Dossiê de Faltas (Standardized) */}
            {alertaFaltasAtivo && (
                <ModalUniversal
                    titulo={`Dossiê de Frequência`}
                    subtitulo="Detalhamento cronológico de telemetria escolar"
                    icone={Activity}
                    aoFechar={() => definirAlertaFaltasAtivo(null)}
                    tamanho="lg"
                >
                    <div className="space-y-8 pb-4">
                        <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl rounded-full"></div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{alertaFaltasAtivo.aluno_nome}</h3>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">MATRICULA: {alertaFaltasAtivo.aluno_matricula}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-xl">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{alertaFaltasAtivo.turma_nome}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100 flex items-start gap-5 shadow-lg shadow-rose-900/5 transition-all hover:scale-[1.01]">
                            <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center border border-rose-500 shadow-xl shrink-0">
                                <AlertCircle size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h4 className="font-black text-[10px] text-rose-600 uppercase tracking-[0.2em] mb-1.5">Diagnóstico Técnico</h4>
                                <p className="text-sm text-rose-900 leading-relaxed font-bold">{alertaFaltasAtivo.motivo}</p>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Clock size={14} className="text-indigo-500" />
                                    Telemetria de Acessos (Janela: 30 dias)
                                </h4>
                                {historicoAtivo.length > 0 && (
                                    <span className="text-[9px] font-black text-indigo-600 bg-white border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                        {historicoAtivo.length} Registros
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar p-1">
                                {carregandoHistorico ? (
                                    <div className="py-16 flex flex-col items-center gap-4 text-slate-400 opacity-50 grayscale">
                                        <Loader2 size={32} className="animate-spin text-indigo-600" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Consultando Datacenter...</span>
                                    </div>
                                ) : historicoAtivo.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center gap-3">
                                        <Clock size={32} className="text-slate-200" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inexistência de logs digitais no período</p>
                                    </div>
                                ) : (
                                    historicoAtivo.map(registro => (
                                        <div key={registro.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-300 transition-all hover:shadow-lg hover:shadow-indigo-900/5 group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${registro.tipo_movimentacao === 'ENTRADA' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}></div>
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest group-hover:text-indigo-700 transition-colors">{registro.tipo_movimentacao}</span>
                                            </div>
                                            <div className="flex items-center gap-2 font-mono text-[10px] font-black text-slate-400 group-hover:text-slate-900 transition-colors">
                                                <History size={12} className="text-slate-200" />
                                                {format(parseISO(registro.timestamp), "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <Botao
                            variante="secundario"
                            fullWidth
                            tamanho="lg"
                            onClick={() => definirAlertaFaltasAtivo(null)}
                        >
                            Fechar Análise
                        </Botao>
                    </div>
                </ModalUniversal>
            )}
        </LayoutAdministrativo>
    )
}

function CardMetrica({ label, valor, icon, className = "" }: { label: string, valor: number, icon: React.ReactNode, className?: string }) {
    return (
        <CartaoConteudo className={`p-8 flex items-center gap-6 hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden group rounded-[2.5rem] shadow-2xl ${className}`}>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-900/[0.02] rounded-full group-hover:scale-150 transition-transform"></div>
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 shadow-xl group-hover:rotate-6 transition-transform z-10">
                {icon}
            </div>
            <div className="z-10">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1 leading-none">{label}</p>
                <p className="text-3xl font-black text-slate-900 leading-tight tracking-tighter">{valor}</p>
            </div>
        </CartaoConteudo>
    );
}

function BadgeStatus({ status }: { status: StatusRiscoAbandono }) {
    if (status === 'PENDENTE') {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-700 bg-rose-50 border-2 border-rose-100 shadow-sm transition-all hover:scale-110">
                <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.4)]"></div> Registro Crítico
            </span>
        );
    }
    if (status === 'EM_ANALISE') {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border-2 border-amber-100 shadow-sm transition-all hover:scale-110">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div> Em Trincheira
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border-2 border-emerald-100 shadow-sm transition-all hover:scale-110">
            <div className="w-2 h-2 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> Fluxo Estabilizado
        </span>
    );
}
