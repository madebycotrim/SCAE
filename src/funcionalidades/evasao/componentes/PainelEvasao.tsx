import { useState, useMemo } from 'react';
import { usarEvasao } from '../hooks/usarEvasao';
import { AlertaEvasao } from '../types/evasao.tipos';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Search,
    TrendingDown,
    User,
    Calendar,
    Phone,
    Mail,
    Clock,
    Zap,
    History,
    MoreVertical,
    Target,
    Filter
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PainelEvasao() {
    const {
        alertas,
        carregando,
        processando,
        tratarAlerta,
        rodarMotorEvasao
    } = usarEvasao();

    const [idAlertaAtivo, definirIdAlertaAtivo] = useState<string | null>(null);
    const [pesquisa, definirPesquisa] = useState('');

    // Dados Filtrados
    const alertasFiltrados = useMemo(() => {
        return alertas.filter(a =>
            a.aluno_nome?.toLowerCase().includes(pesquisa.toLowerCase()) ||
            a.aluno_matricula.includes(pesquisa)
        );
    }, [alertas, pesquisa]);

    const alertaAtivo = useMemo(() =>
        alertas.find(a => a.id === idAlertaAtivo),
        [alertas, idAlertaAtivo]
    );

    // Métricas Quick Look
    const metricas = {
        total: alertas.length,
        criticos: alertas.filter(a => a.status === 'PENDENTE').length,
        emTratativa: alertas.filter(a => a.status === 'EM_ANALISE').length,
        resolvidos: alertas.filter(a => a.status === 'RESOLVIDO').length
    };

    return (
        <LayoutAdministrativo
            titulo="Evasion Command Center"
            subtitulo="Monitoramento estratégico e preventivo de alunos em risco."
            acoes={
                <button
                    onClick={rodarMotorEvasao}
                    disabled={processando || carregando}
                    className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl hover:bg-rose-700 transition font-bold shadow-lg shadow-rose-600/20 hover:scale-105 active:scale-95 border border-white/10 text-sm"
                >
                    <Zap size={18} className={processando ? "animate-pulse" : ""} />
                    {processando ? "Sincronizando..." : "Executar Motor"}
                </button>
            }
        >
            <div className="flex flex-col h-[calc(100vh-250px)] gap-6">

                {/* Métricas Padronizadas (Cards Suaves) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <CardMetrica
                        label="Ativos Monitorados"
                        valor={metricas.total}
                        sub="Volume Total"
                        icon={<Activity className="text-indigo-600" size={20} />}
                        cor="bg-white border-2 border-indigo-100 shadow-sm"
                    />
                    <CardMetrica
                        label="Casos Críticos"
                        valor={metricas.criticos}
                        sub="Ação Inmediata"
                        icon={<AlertCircle className="text-rose-500" size={20} />}
                        cor="bg-white border-2 border-rose-100 shadow-sm"
                    />
                    <CardMetrica
                        label="Em Tratativa"
                        valor={metricas.emTratativa}
                        sub="Acompanhamento"
                        icon={<Clock className="text-amber-500" size={20} />}
                        cor="bg-white border-2 border-amber-100 shadow-sm"
                    />
                    <CardMetrica
                        label="Retidos"
                        valor={metricas.resolvidos}
                        sub="Fidelizados"
                        icon={<CheckCircle2 className="text-emerald-500" size={20} />}
                        cor="bg-white border-2 border-emerald-100 shadow-sm"
                    />
                </div>

                {/* Main Viewport */}
                <div className="flex-1 flex gap-6 overflow-hidden">

                    {/* Lista Lateral (Light & Clean) */}
                    <div className="w-80 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-all" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar aluno..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300 uppercase tracking-widest transition-all"
                                    value={pesquisa}
                                    onChange={(e) => definirPesquisa(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {alertasFiltrados.map(alerta => (
                                <button
                                    key={alerta.id}
                                    onClick={() => definirIdAlertaAtivo(alerta.id)}
                                    className={`w-full p-4 rounded-2xl transition-all flex items-start gap-3 text-left group ${idAlertaAtivo === alerta.id
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                            : 'hover:bg-slate-50 text-slate-600'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 ${idAlertaAtivo === alerta.id ? 'border-white/20 bg-white/10' : 'border-slate-100 bg-slate-50'
                                        }`}>
                                        <User size={18} className={idAlertaAtivo === alerta.id ? 'text-white' : 'text-slate-400'} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-black uppercase tracking-widest truncate leading-tight">
                                            {alerta.aluno_nome}
                                        </p>
                                        <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 opacity-60 ${idAlertaAtivo === alerta.id ? 'text-white' : 'text-slate-400'
                                            }`}>
                                            {alerta.turma_nome}
                                        </p>
                                    </div>
                                    {idAlertaAtivo === alerta.id && <ChevronRight size={14} className="shrink-0 mt-1" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stage de Trabalho (Dossiê) */}
                    <div className="flex-1 bg-white border border-slate-200 rounded-3xl flex flex-col overflow-hidden shadow-sm">
                        {alertaAtivo ? (
                            <div className="flex flex-col h-full animate-fade-in">
                                {/* Dossiê Header */}
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 bg-white rounded-3xl border-2 border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm relative group overflow-hidden">
                                            <User size={32} />
                                            <div className={`absolute bottom-0 left-0 right-0 h-1 ${alertaAtivo.status === 'PENDENTE' ? 'bg-rose-500' :
                                                    alertaAtivo.status === 'EM_ANALISE' ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.2em] ${alertaAtivo.status === 'PENDENTE' ? 'bg-rose-100 text-rose-600 border border-rose-200' :
                                                        alertaAtivo.status === 'EM_ANALISE' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                                                    }`}>
                                                    {alertaAtivo.status}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Matrícula {alertaAtivo.aluno_matricula}</span>
                                            </div>
                                            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-tight">{alertaAtivo.aluno_nome}</h2>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                Unidade Escolar SCAE • Turma {alertaAtivo.turma_nome}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all">
                                            <MoreVertical size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Dossiê Content */}
                                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        {/* Detalhes do Risco */}
                                        <div className="space-y-6">
                                            <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                                                <Filter size={14} /> Análise do Motor
                                            </h4>
                                            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 relative overflow-hidden group">
                                                <TrendingDown className="absolute -right-6 -bottom-6 text-indigo-500 opacity-[0.03] group-hover:scale-110 transition-transform duration-700" size={160} />
                                                <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                                    "{alertaAtivo.motivo}"
                                                </p>
                                                <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span>Data da Ocorrência</span>
                                                    <span className="text-slate-600">
                                                        {format(parseISO(alertaAtivo.data_criacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ações Técnicas */}
                                        <div className="space-y-6">
                                            <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                                                <Activity size={14} /> Protocolo de Contato
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <BotaoAcaoRapida icon={<Phone size={16} />} label="Ligar p/ Família" />
                                                <BotaoAcaoRapida icon={<Mail size={16} />} label="Enviar E-mail" />
                                                <BotaoAcaoRapida icon={<Calendar size={16} />} label="Agendar Reunião" />
                                                <BotaoAcaoRapida icon={<History size={16} />} label="Visualizar Faltas" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Histórico Técnico */}
                                    <div className="space-y-6">
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Relatórios de Intervenção</h4>
                                        <div className="space-y-4">
                                            <TimelineStep
                                                title="Alerta Crítico Gerado"
                                                desc="O sistema identificou um padrão de ausência acima do threshold configurado."
                                                time="HOJE, 09:30"
                                                ativo
                                            />
                                            <TimelineStep
                                                title="Revisão Cadastral"
                                                desc="Dados de contato e endereço verificados para início da tratativa."
                                                time="28/02/2026"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Dossiê Footer */}
                                <div className="p-8 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/20">
                                    <button
                                        onClick={() => definirIdAlertaAtivo(null)}
                                        className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                        Fechar Vista
                                    </button>

                                    {alertaAtivo.status === 'PENDENTE' && (
                                        <button
                                            onClick={() => tratarAlerta(alertaAtivo.id, 'EM_ANALISE')}
                                            className="px-8 py-3 bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Iniciar Tratativa
                                        </button>
                                    )}

                                    {alertaAtivo.status === 'EM_ANALISE' && (
                                        <button
                                            onClick={() => tratarAlerta(alertaAtivo.id, 'RESOLVIDO')}
                                            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Finalizar Caso
                                        </button>
                                    )}

                                    {alertaAtivo.status === 'RESOLVIDO' && (
                                        <button
                                            onClick={() => tratarAlerta(alertaAtivo.id, 'EM_ANALISE')}
                                            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Reabrir Investigação
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 animate-fade-in opacity-40">
                                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-8 border border-slate-200 shadow-sm">
                                    <Target size={40} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-black text-slate-700 uppercase tracking-[0.3em] mb-3">Linha Verde de Monitoramento</h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest max-w-xs leading-relaxed">
                                    Selecione um registro na linha do tempo para carregar o dossiê de inteligência e iniciar os protocolos de retenção.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    )
}

function CardMetrica({ label, valor, sub, icon, cor }: { label: string, valor: number, sub: string, icon: React.ReactNode, cor: string }) {
    return (
        <div className={`p-6 rounded-3xl flex items-center gap-5 transition-all hover:scale-[1.02] ${cor}`}>
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-2">{label}</p>
                <p className="text-3xl font-black text-slate-800 leading-none">{valor}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mt-1">{sub}</p>
            </div>
        </div>
    );
}

function BotaoAcaoRapida({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <button className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:text-indigo-600 transition-all group shadow-sm">
            <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                {icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}

function TimelineStep({ title, desc, time, ativo = false }: { title: string, desc: string, time: string, ativo?: boolean }) {
    return (
        <div className="flex gap-4 relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-slate-100">
            <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm ring-1 transition-all ${ativo ? 'bg-indigo-600 ring-indigo-100' : 'bg-slate-300 ring-slate-100'
                }`} />
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <p className={`text-[11px] font-black uppercase tracking-widest ${ativo ? 'text-indigo-600' : 'text-slate-600'}`}>{title}</p>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{time}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-md">{desc}</p>
            </div>
        </div>
    );
}

