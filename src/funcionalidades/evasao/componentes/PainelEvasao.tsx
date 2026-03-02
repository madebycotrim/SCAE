import { useState, useMemo } from 'react';
import { usarEvasao } from '../hooks/usarEvasao';
import { AlertaEvasao, StatusEvasao } from '../types/evasao.tipos';
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

export default function PainelEvasao() {
    const {
        alertas,
        carregando,
        processando,
        tratarAlerta,
        rodarMotorEvasao
    } = usarEvasao();

    const [pesquisa, definirPesquisa] = useState('');
    const [filtroStatus, definirFiltroStatus] = useState<StatusEvasao | 'TODOS'>('TODOS');
    const [paginaAtual, definirPaginaAtual] = useState(1);
    const itensPorPagina = 10;

    // Modal state for viewing absences
    const [alertaFaltasAtivo, definirAlertaFaltasAtivo] = useState<AlertaEvasao | null>(null);

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
            titulo="Gestão de Evasão"
            subtitulo="Monitoramento estratégico e controle preditivo contra evasão escolar."
            acoes={
                <button
                    onClick={rodarMotorEvasao}
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

                {/* Filtros e Busca */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex w-full md:w-auto gap-4 flex-col sm:flex-row">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por aluno ou matrícula..."
                                value={pesquisa}
                                onChange={(e) => {
                                    definirPesquisa(e.target.value);
                                    definirPaginaAtual(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-md text-sm outline-none transition-colors"
                            />
                        </div>
                        <select
                            value={filtroStatus}
                            onChange={(e) => {
                                definirFiltroStatus(e.target.value as StatusEvasao | 'TODOS');
                                definirPaginaAtual(1);
                            }}
                            className="bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-md text-sm px-3 py-2 outline-none transition-colors"
                        >
                            <option value="TODOS">Todos os Status</option>
                            <option value="PENDENTE">A Fazer</option>
                            <option value="EM_ANALISE">Em Análise</option>
                            <option value="RESOLVIDO">Resolvido</option>
                        </select>
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
                                                        onChange={(e) => tratarAlerta(alerta.id, e.target.value as StatusEvasao)}
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
                estaAberto={!!alertaFaltasAtivo}
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
                            <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Registro Detalhado (Últimos Dias)</h4>
                            <div className="space-y-3">
                                {/* Placeholders indicando os dias de ausência para compor o histórico */}
                                <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                        <span className="text-sm font-medium text-gray-700">Falta Integral</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{format(new Date(), "dd/MM/yyyy")}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                        <span className="text-sm font-medium text-gray-700">Falta Integral</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{format(new Date(Date.now() - 86400000 * 2), "dd/MM/yyyy")}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                        <span className="text-sm font-medium text-gray-700">Entrada Tardia (Atraso)</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{format(new Date(Date.now() - 86400000 * 5), "dd/MM/yyyy")}</span>
                                </div>
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

function BadgeStatus({ status }: { status: StatusEvasao }) {
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
