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
            {processando ? "Atualizando..." : "Atualizar Lista"}
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Acompanhamento de Faltas"
            subtitulo="Monitore alunos com muitas faltas consecutivas para evitar o abandono escolar"
            acoes={AcoesHeader}
        >
            <div className="space-y-8 pb-12">

                {/* Métricas Master Style */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <CardMetrica
                        label="Total de Alertas"
                        valor={metricas.total}
                        icon={<Activity size={20} />}
                        cor="slate"
                    />
                    <CardMetrica
                        label="Atenção Urgente"
                        valor={metricas.criticos}
                        icon={<ShieldAlert size={20} />}
                        cor="rose"
                    />
                    <CardMetrica
                        label="Em Análise"
                        valor={metricas.emTratativa}
                        icon={<Clock size={20} />}
                        cor="amber"
                    />
                    <CardMetrica
                        label="Casos Resolvidos"
                        valor={metricas.resolvidos}
                        icon={<CheckCircle2 size={20} />}
                        cor="emerald"
                    />
                </div>

                {/* Toolbar de Filtros */}
                <BarraFiltro className="bg-slate-50 border-slate-200/60 shadow-suave p-4 rounded-2xl">
                    <div className="flex flex-col gap-2.5 flex-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Buscar Aluno</label>
                        <InputBusca
                            icone={Search}
                            placeholder="Pesquisar por nome ou matrícula..."
                            value={pesquisa}
                            onChange={(e) => {
                                definirPesquisa(e.target.value);
                                definirPaginaAtual(1);
                            }}
                            className="w-full h-9 rounded-2xl"
                        />
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap gap-6 items-end">
                        <div className="flex flex-col gap-2.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Situação do Alerta</label>
                            <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 h-9 shadow-suave">
                                {(['TODOS', 'PENDENTE', 'EM_ANALISE', 'RESOLVIDO'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            definirFiltroStatus(status);
                                            definirPaginaAtual(1);
                                        }}
                                        className={`px-5 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all outline-none flex items-center justify-center border ${filtroStatus === status
                                            ? 'bg-slate-800 text-white border-slate-700 shadow-suave'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                                            }`}
                                    >
                                        {status === 'TODOS' ? 'Todos' : status === 'PENDENTE' ? 'Urgentes' : status === 'EM_ANALISE' ? 'Em Análise' : 'Resolvido'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </BarraFiltro>

                {/* Tabela de Alertas SaaS Premium */}
                <CartaoConteudo className="bg-white border-slate-200/60 shadow-2xl rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200">
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estudante</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Turma</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Motivo do Alerta</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data do Alerta</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Situação</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
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
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Nenhum aluno com faltas excessivas no momento</p>
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
                                                        className="text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 outline-none hover:border-indigo-300 focus:ring-4 focus:ring-indigo-600/5 transition-all cursor-pointer shadow-suave"
                                                    >
                                                        <option value="PENDENTE">Status: Urgente</option>
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
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-suave">
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
                    titulo={`Histórico de Presença`}
                    subtitulo="Veja detalhadamente os dias que o aluno esteve ou não na escola"
                    icone={Activity}
                    aoFechar={() => definirAlertaFaltasAtivo(null)}
                    tamanho="lg"
                >
                    <div className="space-y-8 pb-4">
                        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
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

                        <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100 flex items-start gap-5 shadow-lg shadow-rose-900/5 transition-all hover:scale-[1.01]">
                            <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center border border-rose-500 shadow-xl shrink-0">
                                <AlertCircle size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h4 className="font-black text-[10px] text-rose-600 uppercase tracking-[0.2em] mb-1.5">Análise do Alerta</h4>
                                <p className="text-sm text-rose-900 leading-relaxed font-bold">{alertaFaltasAtivo.motivo}</p>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Clock size={14} className="text-indigo-500" />
                                    Registros de Entrada e Saída (Últimos 30 dias)
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
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Buscando informações...</span>
                                    </div>
                                ) : historicoAtivo.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-3">
                                        <Clock size={32} className="text-slate-200" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nenhum registro encontrado no período</p>
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
                            Fechar Histórico
                        </Botao>
                    </div>
                </ModalUniversal>
            )}
        </LayoutAdministrativo>
    )
}

function CardMetrica({ label, valor, icon, cor }: { label: string, valor: number, icon: React.ReactNode, cor: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate' }) {
    const cores = {
        indigo: "border-l-indigo-600 bg-indigo-50/30 text-indigo-600",
        emerald: "border-l-emerald-600 bg-emerald-50/30 text-emerald-600",
        rose: "border-l-rose-600 bg-rose-50/30 text-rose-600",
        amber: "border-l-amber-600 bg-amber-50/30 text-amber-600",
        slate: "border-l-slate-400 bg-slate-50 text-slate-400"
    };

    return (
        <div className={`p-6 bg-white border border-slate-200/60 border-l-4 ${cores[cor]} rounded-r-lg hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden group shadow-suave flex items-center gap-5`}>
            <div className={`w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-100 shadow-suave z-10 transition-transform group-hover:scale-110`}>
                {icon}
            </div>
            <div className="z-10">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1 leading-none">{label}</p>
                <p className="text-2xl font-black text-slate-900 leading-tight tracking-tighter">{valor}</p>
            </div>
        </div>
    );
}

function BadgeStatus({ status }: { status: StatusRiscoAbandono }) {
    if (status === 'PENDENTE') {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200 shadow-suave transition-all hover:scale-105">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.4)]"></div> Urgente
            </span>
        );
    }
    if (status === 'EM_ANALISE') {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 shadow-suave transition-all hover:scale-105">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div> Em Análise
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-suave transition-all hover:scale-105">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> Resolvido
        </span>
    );
}

