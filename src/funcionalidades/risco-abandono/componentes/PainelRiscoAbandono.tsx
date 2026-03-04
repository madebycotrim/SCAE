// TODO: refatorar arquivo longo (> 300 linhas) para extrair lógica em hooks ou componentes menores, reduzindo a dívida técnica
﻿import { useState, useMemo, useEffect } from 'react';
import type { RegistroAcessoLocal } from '@compartilhado/types/bancoLocal.tipos';
import { usarRiscoAbandono } from '../hooks/usarRiscoAbandono';
import { AlertaRiscoAbandono, StatusRiscoAbandono } from '../types/riscoAbandono.tipos';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Search,
    Clock,
    Zap,
    History,
    Filter,
    ChevronLeft,
    ChevronRight,
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

    return (
        <LayoutAdministrativo
            titulo="Gestão de Risco de Abandono"
            subtitulo="Monitoramento estratégico e controle preditivo de frequência."
            acoes={
                <button
                    onClick={rodarMotorRiscoAbandono}
                    disabled={processando || carregando}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50 text-sm font-medium"
                >
                    <Zap size={16} className={processando ? "animate-pulse" : ""} />
                    {processando ? "Processando..." : "Executar Análise"}
                </button>
            }
        >
            <div className="space-y-6 animate-fade-in">

                {/* Métricas Padronizadas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <CardMetrica
                        label="Total de Alertas"
                        valor={metricas.total}
                        icon={<Activity className="text-gray-500" size={20} />}
                    />
                    <CardMetrica
                        label="Críticos (Pendentes)"
                        valor={metricas.criticos}
                        icon={<AlertCircle className="text-rose-500" size={20} />}
                    />
                    <CardMetrica
                        label="Em Análise"
                        valor={metricas.emTratativa}
                        icon={<Clock className="text-amber-500" size={20} />}
                    />
                    <CardMetrica
                        label="Casos Resolvidos"
                        valor={metricas.resolvidos}
                        icon={<CheckCircle2 className="text-emerald-500" size={20} />}
                    />
                </div>

                {/* Toolbar de Filtros - Flat Design */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center gap-4 sticky top-4 z-20">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por aluno ou matrícula..."
                            value={pesquisa}
                            onChange={(e) => {
                                definirPesquisa(e.target.value);
                                definirPaginaAtual(1);
                            }}
                            className="w-full pl-11 pr-4 h-10 bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md text-sm outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
                        <div className="hidden md:block h-6 w-px bg-slate-200 mx-1"></div>

                        <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200 overflow-x-auto h-10">
                            {(['TODOS', 'PENDENTE', 'EM_ANALISE', 'RESOLVIDO'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => {
                                        definirFiltroStatus(status);
                                        definirPaginaAtual(1);
                                    }}
                                    className={`px-4 h-full rounded text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors outline-none cursor-pointer flex items-center justify-center ${filtroStatus === status
                                        ? 'bg-gray-800 text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                                        }`}
                                >
                                    {status === 'TODOS' ? 'Todos os Status' : status === 'PENDENTE' ? 'A Fazer' : status === 'EM_ANALISE' ? 'Em Análise' : 'Resolvido'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabela de Alertas */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Aluno</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Turma</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Motivo do Risco</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Data do Alerta</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Status</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Ações Rápidas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginados.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                                    <AlertCircle size={32} className="text-gray-400" />
                                                </div>
                                                <p className="text-lg font-bold text-gray-800">Nenhum registro encontrado</p>
                                                <p className="text-sm text-gray-500 mt-1">Tente alterar os filtros ou rode a análise novamente.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginados.map((alerta) => (
                                        <tr key={alerta.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-900 text-sm">{alerta.aluno_nome}</span>
                                                    <span className="text-xs text-gray-500">{alerta.aluno_matricula}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-6 text-sm text-gray-600">{alerta.turma_nome}</td>
                                            <td className="py-3 px-6 text-sm text-gray-600 max-w-xs truncate" title={alerta.motivo}>
                                                {alerta.motivo}
                                            </td>
                                            <td className="py-3 px-6 text-sm text-gray-600">
                                                {format(parseISO(alerta.data_criacao), "dd/MM/yyyy", { locale: ptBR })}
                                            </td>
                                            <td className="py-3 px-6 text-center">
                                                <BadgeStatus status={alerta.status} />
                                            </td>
                                            <td className="py-3 px-6 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <select
                                                        value={alerta.status}
                                                        onChange={(e) => tratarAlerta(alerta.id, e.target.value as StatusRiscoAbandono)}
                                                        className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                                                    >
                                                        <option value="PENDENTE">Pendente</option>
                                                        <option value="EM_ANALISE">Em Análise</option>
                                                        <option value="RESOLVIDO">Resolvido</option>
                                                    </select>

                                                    <button
                                                        onClick={() => definirAlertaFaltasAtivo(alerta)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                                                        title="Visualizar Histórico de Faltas"
                                                    >
                                                        <History size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Paginação */}
                {totalPaginas > 1 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                        <span className="text-sm text-gray-500">
                            Mostrando página <span className="font-semibold text-gray-900">{paginaAtual}</span> de <span className="font-semibold text-gray-900">{totalPaginas}</span>
                        </span>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => definirPaginaAtual(Math.max(1, paginaAtual - 1))}
                                disabled={paginaAtual === 1}
                                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => definirPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                                disabled={paginaAtual === totalPaginas}
                                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Histórico de Faltas */}
            <ModalUniversal
                aberto={!!alertaFaltasAtivo}
                aoFechar={() => definirAlertaFaltasAtivo(null)}
                titulo={`Histórico de Faltas`}
            >
                {alertaFaltasAtivo && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">{alertaFaltasAtivo.aluno_nome}</h3>
                            <p className="text-sm text-gray-500">Matrícula: {alertaFaltasAtivo.aluno_matricula}</p>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-lg flex items-start gap-3">
                            <Filter size={20} className="shrink-0 mt-0.5 text-blue-600" />
                            <div>
                                <h4 className="font-semibold text-sm">Resumo do Risco Predito</h4>
                                <p className="text-sm mt-1">{alertaFaltasAtivo.motivo}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Registro Detalhado (Acessos Recentes)</h4>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {carregandoHistorico ? (
                                    <div className="text-center py-4 text-sm text-gray-500">Buscando histórico de acessos...</div>
                                ) : historicoAtivo.length === 0 ? (
                                    <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded border border-gray-100">
                                        Nenhum registro de acesso eletrônico/manual encontrado para este aluno nos últimos dias.
                                    </div>
                                ) : (
                                    historicoAtivo.map(registro => (
                                        <div key={registro.id} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${registro.tipo_movimentacao === 'ENTRADA' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-700">{registro.tipo_movimentacao}</span>
                                                </div>
                                            </div>
                                            <span className="text-sm font-mono text-gray-600">
                                                {format(parseISO(registro.timestamp), "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button
                                onClick={() => definirAlertaFaltasAtivo(null)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Fechar Histórico
                            </button>
                        </div>
                    </div>
                )}
            </ModalUniversal>
        </LayoutAdministrativo>
    )
}

function CardMetrica({ label, valor, icon }: { label: string, valor: number, icon: React.ReactNode }) {
    return (
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center shrink-0 border border-gray-100">
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{valor}</p>
            </div>
        </div>
    );
}

function BadgeStatus({ status }: { status: StatusRiscoAbandono }) {
    if (status === 'PENDENTE') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-600"></div> Pendente
            </span>
        );
    }
    if (status === 'EM_ANALISE') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Em Análise
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div> Resolvido
        </span>
    );
}
