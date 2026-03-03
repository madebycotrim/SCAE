import { useState, useRef } from 'react';
import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { usarPermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';

import {
    FileText,
    Download,
    BarChart2,
    FileSpreadsheet,
    FileCheck,
    Clock
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { relatorioServico } from '../servicos/relatorioServico';

const log = criarRegistrador('Relatorios');

export default function Relatorios() {

    const { podeVerLogs } = usarPermissoes();
    const anoAtual = new Date().getFullYear();

    const calcularPeriodo = (ano: number, semestre: 1 | 2) => {
        if (semestre === 1) return { dataInicio: `${ano}-01-01`, dataFim: `${ano}-06-30` };
        return { dataInicio: `${ano}-07-01`, dataFim: `${ano}-12-31` };
    };

    const [filtros, definirFiltros] = useState(() => {
        const semestre = new Date().getMonth() < 6 ? 1 : 2;
        return { anoLetivo: anoAtual, semestre: semestre as 1 | 2, ...calcularPeriodo(anoAtual, semestre as 1 | 2), turma: 'Todas' };
    });
    const [mostrarDropdownTurma, definirMostrarDropdownTurma] = useState(false);
    const refDropdownTurma = useRef<HTMLDivElement>(null);

    const { dados: turmasDisponiveis = [], carregando } = usarConsulta(
        ['turmas-relatorios'],
        async () => {
            const banco = await bancoLocal.iniciarBanco();
            const [alunos, turmas] = await Promise.all([
                banco.getAll('alunos'),
                banco.getAll('turmas')
            ]);
            if (turmas.length > 0) {
                return turmas.map((t: any) => t.id).sort();
            } else {
                const turmasAlunos = [...new Set(alunos.map((a: any) => a.turma_id).filter((t: any) => t))];
                return (turmasAlunos as string[]).sort();
            }
        },
        { staleTime: 5 * 60 * 1000 }
    );

    const gerarRelatorio = async (tipo: string) => {
        const toastId = toast.loading(`Processando relatório: ${tipo}...`);
        try {
            if (tipo === 'Risco de Evasão' || tipo === 'Fechamento Mensal') {
                await relatorioServico.gerarRelatorioEspecial(tipo, filtros);
            } else {
                const dados = await relatorioServico.obterDadosFiltrados(filtros);
                if (dados.length === 0) throw new Error('Nenhum dado encontrado.');
                relatorioServico.gerarPDF(dados, `Relatório de ${tipo}`, filtros);
            }

            await Registrador.registrar('EXPORTAR_RELATORIO', 'relatorio', tipo, { filtros, formato: 'PDF' });
            toast.success('Relatório gerado com sucesso!', { id: toastId });
        } catch (e: any) {
            log.error('Erro ao exportar relatório', e);
            toast.error(e.message || 'Erro ao gerar relatório.', { id: toastId });
        }
    };

    const CARDS_RELATORIO = [
        {
            titulo: 'Frequência Diária',
            descricao: 'Relatório detalhado de entradas e saídas do período selecionado.',
            icone: Clock,
            badgeTxt: 'PDF',
            badgeCor: 'bg-blue-50 text-blue-700 border-blue-200',
            iconeCor: 'bg-blue-50 text-blue-600',
            acao: () => gerarRelatorio('Frequência Diária'),
        },
        {
            titulo: 'Fechamento Mensal',
            descricao: 'Consolidado de presença do mês para secretaria e direção.',
            icone: FileSpreadsheet,
            badgeTxt: 'PDF',
            badgeCor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            iconeCor: 'bg-emerald-50 text-emerald-600',
            acao: () => gerarRelatorio('Fechamento Mensal'),
        },
        {
            titulo: 'Risco de Evasão',
            descricao: 'Alunos com baixo índice de frequência nos últimos 30 dias.',
            icone: BarChart2,
            badgeTxt: 'PDF',
            badgeCor: 'bg-amber-50 text-amber-700 border-amber-200',
            iconeCor: 'bg-amber-50 text-amber-600',
            acao: () => gerarRelatorio('Risco de Evasão'),
        },
        // Log de Auditoria: apenas ADMIN e COORDENACAO
        ...(podeVerLogs ? [{
            titulo: 'Log de Auditoria',
            descricao: 'Histórico completo de acessos e ações registradas no sistema.',
            icone: FileCheck,
            badgeTxt: 'PDF',
            badgeCor: 'bg-slate-100 text-slate-700 border-slate-200',
            iconeCor: 'bg-slate-100 text-slate-600',
            acao: () => gerarRelatorio('Log de Auditoria'),
        }] : []),
    ];

    return (
        <LayoutAdministrativo
            titulo="Central de Relatórios"
            subtitulo="Análise de dados e exportação oficial"
            acoes={null}
        >
            <div className="space-y-6 pb-10">

                {/* Toolbar de Filtros */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-end gap-4 sticky top-4 z-20">

                    {/* Ano Letivo */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Ano Letivo</label>
                        <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200 h-10">
                            {[anoAtual - 1, anoAtual, anoAtual + 1].map((ano) => (
                                <button
                                    key={ano}
                                    onClick={() => {
                                        const periodo = calcularPeriodo(ano, filtros.semestre);
                                        definirFiltros({ ...filtros, anoLetivo: ano, ...periodo });
                                    }}
                                    className={`px-4 h-full rounded text-sm font-medium transition-colors outline-none cursor-pointer ${filtros.anoLetivo === ano ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {ano}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:block h-6 w-px bg-gray-200 self-end mb-2" />

                    {/* Semestre */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Semestre</label>
                        <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200 h-10">
                            {([1, 2] as const).map((sem) => (
                                <button
                                    key={sem}
                                    onClick={() => {
                                        const periodo = calcularPeriodo(filtros.anoLetivo, sem);
                                        definirFiltros({ ...filtros, semestre: sem, ...periodo });
                                    }}
                                    className={`px-4 h-full rounded text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors outline-none cursor-pointer ${filtros.semestre === sem ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}
                                >
                                    {sem}º Sem.
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:block h-6 w-px bg-gray-200 self-end mb-2" />

                    {/* Turma */}
                    <div className="flex flex-col gap-1 flex-1" ref={refDropdownTurma}>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Turma</label>
                        <div className="relative">
                            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={15} />
                            <input
                                type="text"
                                placeholder="Turma (vazio = todas)"
                                value={filtros.turma === 'Todas' ? '' : filtros.turma}
                                onFocus={() => definirMostrarDropdownTurma(true)}
                                onBlur={() => setTimeout(() => definirMostrarDropdownTurma(false), 150)}
                                onChange={(e) => definirFiltros({ ...filtros, turma: e.target.value || 'Todas' })}
                                className="w-full pl-9 pr-3 h-10 bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md text-sm outline-none transition-all text-gray-800 placeholder:text-gray-400"
                            />
                            {mostrarDropdownTurma && (() => {
                                const termo = filtros.turma === 'Todas' ? '' : filtros.turma.toLowerCase();
                                const sugestoes = (turmasDisponiveis ?? [])
                                    .filter((t: string) => t.toLowerCase().includes(termo))
                                    .slice(0, 4);
                                return sugestoes.length > 0 ? (
                                    <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
                                        {sugestoes.map((t: string) => (
                                            <li
                                                key={t}
                                                onMouseDown={() => {
                                                    definirFiltros({ ...filtros, turma: t });
                                                    definirMostrarDropdownTurma(false);
                                                }}
                                                className="px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                                            >
                                                {t}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null;
                            })()}
                        </div>
                    </div>
                </div>

                {/* Lista de Relatórios */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-800">Relatórios Disponíveis</h2>
                        <span className="text-xs font-medium text-gray-400">{CARDS_RELATORIO.length} tipos de exportação</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {CARDS_RELATORIO.map((item, idx) => {
                            const Icone = item.icone;
                            return (
                                <button
                                    key={idx}
                                    onClick={item.acao}
                                    disabled={carregando}
                                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed text-left"
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${item.iconeCor} border-gray-200`}>
                                        <Icone size={18} strokeWidth={2} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{item.titulo}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 truncate">{item.descricao}</p>
                                    </div>

                                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded border ${item.badgeCor} shrink-0`}>
                                        {item.badgeTxt}
                                    </span>

                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 group-hover:text-blue-600 transition-colors shrink-0">
                                        <Download size={14} />
                                        <span className="hidden sm:inline">Exportar</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Rodapé LGPD */}
                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
                    <FileText size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <p>
                        <strong className="text-gray-700">LGPD — Art. 37:</strong> Todos os relatórios exportados são registrados no log de auditoria com a identidade do operador e o período consultado.
                    </p>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
