import { useState, useMemo, useEffect } from 'react';
import type { RegistroAcessoLocal } from '@/compartilhado/types/bancoLocal.tipos';
import { usarRiscoAbandono } from '../hooks/usarRiscoAbandono';
import { AlertaRiscoAbandono, StatusRiscoAbandono } from '../types/riscoAbandono.tipos';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import ModalUniversal from '@/compartilhado/componentes/ModalUniversal';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@/compartilhado/componentes/UI';
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
            tamanho="sm"
            icone={Zap}
            carregando={processando || carregando}
            onClick={rodarMotorRiscoAbandono}
        >
            {processando ? "Atualizando..." : "Atualizar Lista"}
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Gestão de Evasão Escolar"
            subtitulo="Inteligência artificial monitorando o risco de abandono em tempo real"
            acoes={AcoesHeader}
        >
            <div className="space-y-10 pb-12">

                {/* Métricas Quick Look (Luxury 2xl) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <CardMetrica
                        label="Alertas Ativos"
                        valor={metricas.total}
                        icone={Activity}
                        bg="bg-indigo-50/50"
                        text="text-indigo-600"
                        border="border-indigo-100"
                    />
                    <CardMetrica
                        label="Urgência (Art 70)"
                        valor={metricas.criticos}
                        icone={ShieldAlert}
                        bg="bg-rose-50/50"
                        text="text-rose-600"
                        border="border-rose-100"
                    />
                    <CardMetrica
                        label="Crianças em Análise"
                        valor={metricas.emTratativa}
                        icone={Clock}
                        bg="bg-amber-50/50"
                        text="text-amber-600"
                        border="border-amber-100"
                    />
                    <CardMetrica
                        label="Casos Sucesso"
                        valor={metricas.resolvidos}
                        icone={CheckCircle2}
                        bg="bg-emerald-50/50"
                        text="text-emerald-600"
                        border="border-emerald-100"
                    />
                </div>

                {/* Toolbar de Filtros Premium */}
                <div className="bg-white/40 backdrop-blur-md border border-slate-200/60 shadow-xl p-4 rounded-[2rem]">
                    <BarraFiltro className="bg-transparent border-none shadow-none p-0">
                        <div className="flex flex-col gap-2 flex-1 w-full">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 leading-none">Localizar Estudante</label>
                            <InputBusca
                                icone={Search}
                                placeholder="Nome ou matrícula..."
                                value={pesquisa}
                                onChange={(e) => {
                                    definirPesquisa(e.target.value);
                                    definirPaginaAtual(1);
                                }}
                                className="w-full h-12 bg-white/80 border-slate-200 rounded-2xl"
                            />
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 leading-none">Filtro de Gravidade</label>
                            <div className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 h-12">
                                {(['TODOS', 'PENDENTE', 'EM_ANALISE', 'RESOLVIDO'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            definirFiltroStatus(status);
                                            definirPaginaAtual(1);
                                        }}
                                        className={`px-5 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all outline-none flex items-center justify-center border ${filtroStatus === status
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105'
                                            : 'text-slate-400 hover:text-slate-800 border-transparent'
                                            }`}
                                    >
                                        {status === 'TODOS' ? 'Todos' : status === 'PENDENTE' ? 'Urgentes' : status === 'EM_ANALISE' ? 'Em Análise' : 'OK'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </BarraFiltro>
                </div>

                {/* Tabela de Alertas Estilo SaaS Elite */}
                <CartaoConteudo className="bg-white border-slate-200 shadow-2xl rounded-[1.5rem] overflow-hidden">
                    {carregando ? (
                        <div className="py-20 flex flex-col items-center gap-4 text-slate-300">
                             <Loader2 size={40} className="animate-spin text-eletrico" />
                             <span className="text-[11px] font-black uppercase tracking-[0.5em]">Processando Auditoria...</span>
                        </div>
                    ) : paginados.length === 0 ? (
                        <div className="py-24 text-center flex flex-col items-center justify-center animate-fade-in px-8">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-slate-100 shadow-inner">
                                <AlertCircle size={40} className="text-slate-200" />
                            </div>
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-2 leading-none">Ambiente Seguro</h3>
                            <p className="text-[10px] font-bold text-slate-400 max-w-xs mx-auto uppercase tracking-widest leading-relaxed">Nenhum alerta de evasão idenficado no radar atual.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-900 border-b border-slate-800">
                                        <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estudante</th>
                                        <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Turma / Ref</th>
                                        <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status do Abandono</th>
                                        <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Situação Acadêmica</th>
                                        <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações de Gestão</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/60">
                                    {paginados.map((alerta) => (
                                        <tr key={alerta.id} className="hover:bg-slate-50/80 transition-all duration-300 group">
                                            <td className="py-7 px-10">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-slate-900 text-base tracking-tighter group-hover:text-eletrico transition-colors uppercase">{alerta.aluno_nome}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono font-black text-slate-400 tracking-widest bg-slate-100 px-2 py-0.5 rounded">ID: {alerta.aluno_matricula}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-7 px-8">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{alerta.turma_nome || 'SEM TURMA'}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">SCAE CORE CLOUD</span>
                                                </div>
                                            </td>
                                            <td className="py-7 px-8">
                                                <div className="flex items-start gap-2 max-w-[280px]">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0 animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.6)]"></div>
                                                    <p className="text-xs font-bold text-slate-700 leading-relaxed italic" title={alerta.motivo}>
                                                        "{alerta.motivo}"
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-7 px-8 text-center uppercase">
                                                <BadgeStatus status={alerta.status} />
                                            </td>
                                            <td className="py-7 px-10 text-right">
                                                <div className="flex items-center justify-end gap-4" onClick={(e) => e.stopPropagation()}>
                                                    <select
                                                        value={alerta.status}
                                                        onChange={(e) => tratarAlerta(alerta.id, e.target.value as StatusRiscoAbandono)}
                                                        className="text-[10px] font-black uppercase tracking-widest border-2 border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-900 outline-none hover:border-slate-400 transition-all cursor-pointer shadow-sm focus:ring-4 focus:ring-slate-100"
                                                    >
                                                        <option value="PENDENTE">Ação: Manter Urgente</option>
                                                        <option value="EM_ANALISE">Ação: Em Análise</option>
                                                        <option value="RESOLVIDO">Ação: Marcar Resolvido</option>
                                                    </select>

                                                    <Botao
                                                        variante="ghost"
                                                        tamanho="sm"
                                                        icone={History}
                                                        onClick={() => definirAlertaFaltasAtivo(alerta)}
                                                        className="hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl p-3"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CartaoConteudo>
            </div>

            {/* Modal de Dossiê de Faltas (Standardized Luxury) */}
            {alertaFaltasAtivo && (
                <ModalUniversal
                    titulo="Monitoramento de Frequência"
                    subtitulo="Dossiê detalhado para auditoria de evasão escolar"
                    icone={Activity}
                    aoFechar={() => definirAlertaFaltasAtivo(null)}
                    tamanho="lg"
                >
                    <div className="space-y-10 pb-6">
                        {/* Header do Estudante (Estilo Black Card) */}
                        <div className="bg-slate-950 rounded-3xl p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-eletrico/10 blur-[120px] rounded-full group-hover:bg-rose-500/10 transition-colors duration-1000"></div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                                <div>
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-4 block">Alerta de Risco Máximo</span>
                                    <h3 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase">{alertaFaltasAtivo.aluno_nome}</h3>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Matrícula: {alertaFaltasAtivo.aluno_matricula}</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                        <span className="text-[11px] font-black text-eletrico uppercase tracking-widest">{alertaFaltasAtivo.turma_nome}</span>
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 backdrop-blur-xl px-8 py-5 rounded-[2rem] text-center shadow-inner">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">Situação Atual</span>
                                    <BadgeStatus status={alertaFaltasAtivo.status} />
                                </div>
                            </div>
                        </div>

                        {/* Motivo do Alerta (Banner Rose) */}
                        <div className="bg-rose-50/80 backdrop-blur-sm rounded-3xl p-8 border border-rose-100 flex items-start gap-8 shadow-xl shadow-rose-900/5">
                            <div className="w-16 h-16 bg-rose-600 text-white rounded-[1.5rem] flex items-center justify-center border-4 border-rose-500/30 shadow-2xl shrink-0 animate-pulse">
                                <ShieldAlert size={32} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h4 className="font-black text-[11px] text-rose-600 uppercase tracking-[0.3em] mb-3">Evidência Identificada pela Engine</h4>
                                <p className="text-lg text-rose-950 leading-tight font-black tracking-tight uppercase">"{alertaFaltasAtivo.motivo}"</p>
                            </div>
                        </div>

                        {/* Timeline de Registros */}
                        <div>
                            <div className="flex items-center justify-between mb-6 px-4">
                                <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                                    <Clock size={18} className="text-eletrico" />
                                    Timeline de Acesso (D1)
                                </h4>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 pb-1">Últimos 30 Dias</span>
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar p-1">
                                {carregandoHistorico ? (
                                    <div className="py-20 flex flex-col items-center gap-5">
                                        <Loader2 size={40} className="animate-spin text-eletrico opacity-30" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">Interrogando Database...</span>
                                    </div>
                                ) : historicoAtivo.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
                                        <History size={48} className="text-slate-200" />
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] max-w-[250px] leading-relaxed">Nenhum registro de batida encontrado neste período.</p>
                                    </div>
                                ) : (
                                    historicoAtivo.map(registro => (
                                        <div key={registro.id} className="flex justify-between items-center px-8 py-6 bg-white border border-slate-100 rounded-3xl hover:border-eletrico/40 transition-all hover:shadow-2xl hover:shadow-eletrico/5 group">
                                            <div className="flex items-center gap-6">
                                                <div className={`w-4 h-4 rounded-full ${registro.tipo_movimentacao === 'ENTRADA' ? 'bg-emerald-500' : 'bg-rose-500'} shadow-[0_0_15px_rgba(0,0,0,0.1)]`}></div>
                                                <span className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-eletrico transition-colors">{registro.tipo_movimentacao}</span>
                                            </div>
                                            <div className="flex items-center gap-4 font-mono text-xs font-black text-slate-400 group-hover:text-slate-900 transition-colors">
                                                <Calendar size={14} className="text-slate-200" />
                                                {format(parseISO(registro.timestamp), "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="pt-4">
                            <Botao
                                variante="secundario"
                                fullWidth
                                tamanho="lg"
                                onClick={() => definirAlertaFaltasAtivo(null)}
                                className="h-16 rounded-[2rem] text-xs"
                            >
                                Fechar Auditoria
                            </Botao>
                        </div>
                    </div>
                </ModalUniversal>
            )}
        </LayoutAdministrativo>
    )
}

function BadgeStatus({ status }: { status: StatusRiscoAbandono }) {
    if (status === 'PENDENTE') {
        return (
            <span className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-rose-600 shadow-xl shadow-rose-600/20 border-b-4 border-rose-800 active:scale-95 transition-all">
                <ShieldAlert size={14} /> Urgente
            </span>
        );
    }
    if (status === 'EM_ANALISE') {
        return (
            <span className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 bg-amber-400 shadow-xl shadow-amber-400/20 border-b-4 border-amber-600 active:scale-95 transition-all">
                <Clock size={14} /> Em Análise
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500 shadow-xl shadow-emerald-500/20 border-b-4 border-emerald-700 active:scale-95 transition-all">
            <CheckCircle2 size={14} /> Resolvido
        </span>
    );
}

function CardMetrica({ label, valor, icone: Icone, bg, text, border }: { label: string, valor: string | number, icone: any, bg: string, text: string, border: string }) {
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex items-center gap-6 group transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
            <div className={`w-16 h-16 rounded-3xl ${bg} ${text} flex items-center justify-center shrink-0 border-2 ${border} shadow-inner group-hover:scale-110 transition-transform duration-700`}>
                <Icone size={28} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{label}</span>
                <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{valor}</span>
            </div>
        </div>
    );
}
