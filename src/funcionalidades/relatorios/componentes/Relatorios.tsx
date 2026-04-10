import { useState, useRef, useEffect, useMemo } from 'react';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { api } from '@/compartilhado/servicos/api';
import { Registrador } from '@/compartilhado/servicos/auditoria';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { usarPermissoes } from '../../../compartilhado/autorizacao/ContextoPermissoes';

import {
    Download,
    FileSpreadsheet,
    Clock,
    ChevronDown,
    Calendar,
    Layers,
    ArrowRight,
    CheckCircle2,
    Info,
    BarChart2,
    ShieldCheck
} from 'lucide-react';
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

    // Consulta de turmas e contagem de alunos para o resumo online
    const { dados: infoBase = { turmas: [], totalAlunos: 0, alunos: [] }, carregando: carregandoBase } = usarConsulta(
        ['info-base-relatorios-online'],
        async () => {
            const [alunos, turmas] = await Promise.all([
                api.obter<any[]>('/academico/alunos'),
                api.obter<any[]>('/academico/turmas')
            ]);

            const listaAlunos = alunos || [];
            const listaTurmas = turmas || [];

            const turmasIds = listaTurmas.length > 0
                ? listaTurmas.map((t: any) => t.id).sort()
                : [...new Set(listaAlunos.map((a: any) => a.turma_id).filter((t: any) => t))].sort();

            return {
                turmas: turmasIds,
                totalAlunos: listaAlunos.length,
                alunos: listaAlunos
            };
        },
        { staleTime: 5 * 60 * 1000 }
    );

    const gerarRelatorio = async (tipo: string) => {
        const toastId = toast.loading(`Gerando relatório: ${tipo}...`);
        try {
            if (tipo === 'Risco de Evasão' || tipo === 'Fechamento Mensal') {
                await relatorioServico.gerarRelatorioEspecial(tipo, filtros);
            } else {
                const dados = await relatorioServico.obterDadosFiltrados(filtros);
                if (dados.length === 0) throw new Error('Nenhum dado localizado para o período selecionado');
                relatorioServico.gerarPDF(dados, `Relatório de ${tipo}`, filtros);
            }

            await Registrador.registrar('EXPORTAR_RELATORIO', 'relatorio', tipo, { filtros, formato: 'PDF' });
            toast.success('Relatório gerado com sucesso', { id: toastId });
        } catch (e: any) {
            log.error('Erro ao exportar relatório', e);
            toast.error(e.message || 'Falha na geração do documento.', { id: toastId });
        }
    };

    const CARDS_RELATORIO = [
        {
            titulo: 'Frequência Diária',
            descricao: 'Relatório detalhado de entrada e saída dos alunos para controle de portaria e sala de aula.',
            icone: Clock,
            badgeTxt: 'Frequência',
            badgeCor: 'bg-eletrico/10 text-eletrico border-eletrico/20',
            iconeCor: 'bg-eletrico/10 text-eletrico',
            acao: () => gerarRelatorio('Frequência Diária'),
        },
        {
            titulo: 'Ata de Fechamento',
            descricao: 'Documento consolidado para fins de secretaria escolar e histórico institucional.',
            icone: FileSpreadsheet,
            badgeTxt: 'Gestão',
            badgeCor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            iconeCor: 'bg-emerald-50 text-emerald-500',
            acao: () => gerarRelatorio('Fechamento Mensal'),
        },
        {
            titulo: 'Risco de Evasão',
            descricao: 'Análise preventiva baseada em faltas consecutivas para atuação do SOE.',
            icone: BarChart2,
            badgeTxt: 'Preventivo',
            badgeCor: 'bg-amber-50 text-amber-600 border-amber-100',
            iconeCor: 'bg-amber-50 text-amber-500',
            acao: () => gerarRelatorio('Risco de Evasão'),
        },
        {
            titulo: 'Atrasos e Janelas',
            descricao: 'Relatório de alunos que acessaram a escola fora da janela principal ou com atraso permitido.',
            icone: Clock,
            badgeTxt: 'Impontualidade',
            badgeCor: 'bg-amber-50 text-amber-600 border-amber-100',
            iconeCor: 'bg-amber-50 text-amber-500',
            acao: () => gerarRelatorio('Atrasos e Janelas'),
        },
        {
            titulo: 'Divergência de Turno',
            descricao: 'Identifica alunos que realizaram acessos em turnos diferentes do matriculado.',
            icone: ShieldCheck,
            badgeTxt: 'Segurança',
            badgeCor: 'bg-rose-50 text-rose-600 border-rose-100',
            iconeCor: 'bg-rose-50 text-rose-500',
            acao: () => gerarRelatorio('Divergência de Turno'),
        },
        ...(podeVerLogs ? [{
            titulo: 'Auditoria de Acessos',
            descricao: 'Registro técnico de todas as operações realizadas no sistema para segurança de dados.',
            icone: ShieldCheck,
            badgeTxt: 'Segurança',
            badgeCor: 'bg-slate-100 text-slate-600 border-slate-200',
            iconeCor: 'bg-slate-100 text-slate-500',
            acao: () => gerarRelatorio('Log de Auditoria'),
        }] : []),
    ];

    const [relatorioSelecionado, definirRelatorioSelecionado] = useState(CARDS_RELATORIO[0]);

    // Cálculo dinâmico para o resumo
    const quantidadeAlunosPrevista = useMemo(() => {
        if (!infoBase || !infoBase.alunos) return 0;
        if (filtros.turma === 'Todas') return infoBase.alunos.length;
        return infoBase.alunos.filter((a: any) => a.turma_id === filtros.turma).length;
    }, [filtros.turma, infoBase]);

    return (
        <LayoutAdministrativo
            titulo="Relatórios"
            subtitulo="Selecione um módulo para configurar e gerar documentos oficiais"
            acoes={null}
        >
            <div className="flex flex-1 gap-6 min-h-0 overflow-hidden pb-4">
                {/* Master: Lista de Relatórios */}
                <div className="w-80 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 pt-4">
                        {CARDS_RELATORIO.map((item, idx) => {
                            const Icone = item.icone;
                            const estaSelecionado = relatorioSelecionado?.titulo === item.titulo;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => definirRelatorioSelecionado(item)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left group ${estaSelecionado
                                        ? 'bg-slate-50 text-slate-900 shadow-sm ring-1 ring-slate-200'
                                        : 'hover:bg-slate-50/50 text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <div className={`p-2 rounded-2xl border shrink-0 transition-colors ${estaSelecionado
                                        ? 'bg-white border-slate-200 text-eletrico shadow-sm'
                                        : 'bg-transparent border-transparent text-slate-300 group-hover:text-slate-400'
                                        }`}>
                                        <Icone size={16} strokeWidth={2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[11px] font-bold tracking-tight truncate uppercase leading-none mb-1 ${estaSelecionado ? 'text-slate-800' : 'text-slate-500'}`}>
                                            {item.titulo}
                                        </p>
                                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                                            {item.badgeTxt}
                                        </p>
                                    </div>
                                    
                                    {estaSelecionado && (
                                        <div className="w-1 h-3 rounded-full bg-eletrico" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-5 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {CARDS_RELATORIO.length} Módulos Disponíveis
                        </span>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Online
                            </span>
                        </div>
                    </div>
                </div>

                {/* Detail: Painel de Configuração */}
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col relative">
                    {relatorioSelecionado ? (
                        <>
                            {/* Header do Detalhe */}
                            <div className="p-8 border-b border-slate-100 bg-white">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-5">
                                        <div className={`p-4 rounded-2xl border border-slate-100 shadow-sm ${relatorioSelecionado.iconeCor}`}>
                                            <relatorioSelecionado.icone size={28} strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800 tracking-tight uppercase">
                                                {relatorioSelecionado.titulo}
                                            </h2>
                                            <span className={`inline-block mt-1 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-2xl border ${relatorioSelecionado.badgeCor}`}>
                                                {relatorioSelecionado.badgeTxt}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <div className="flex items-center gap-2 justify-end text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                                            Módulo de Exportação
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-2xl">
                                    {relatorioSelecionado.descricao}
                                </p>
                            </div>

                            {/* Área de Filtros e Parâmetros */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white">
                                <div className="max-w-2xl space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Ano Letivo */}
                                        <div className="space-y-3">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                                Ano de Referência
                                            </div>
                                            <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100 h-10">
                                                {[anoAtual - 1, anoAtual, anoAtual + 1].map((ano) => (
                                                    <button
                                                        key={ano}
                                                        onClick={() => {
                                                            const periodo = calcularPeriodo(ano, filtros.semestre);
                                                            definirFiltros({ ...filtros, anoLetivo: ano, ...periodo });
                                                        }}
                                                        className={`flex-1 h-full rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${filtros.anoLetivo === ano
                                                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                                            : 'text-slate-400 hover:text-slate-500'}`}
                                                    >
                                                        {ano}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Semestre */}
                                        <div className="space-y-3">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                                Período Letivo
                                            </div>
                                            <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100 h-10">
                                                {([1, 2] as const).map((sem) => (
                                                    <button
                                                        key={sem}
                                                        onClick={() => {
                                                            const periodo = calcularPeriodo(filtros.anoLetivo, sem);
                                                            definirFiltros({ ...filtros, semestre: sem, ...periodo });
                                                        }}
                                                        className={`flex-1 h-full rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${filtros.semestre === sem
                                                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                                            : 'text-slate-400 hover:text-slate-500'}`}
                                                    >
                                                        {sem}º Sem.
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Turma */}
                                    <div className="space-y-3" ref={refDropdownTurma}>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                            Filtrar por Turma
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Todas as turmas..."
                                                onFocus={() => definirMostrarDropdownTurma(true)}
                                                onBlur={() => setTimeout(() => definirMostrarDropdownTurma(false), 200)}
                                                onChange={(e) => definirFiltros({ ...filtros, turma: e.target.value || 'Todas' })}
                                                value={filtros.turma === 'Todas' ? '' : filtros.turma}
                                                className="w-full pl-5 pr-12 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-eletrico focus:ring-4 focus:ring-eletrico/5 rounded-2xl text-xs font-bold text-slate-700 outline-none transition-all placeholder:text-slate-400"
                                            />
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />

                                            {mostrarDropdownTurma && (() => {
                                                const termo = filtros.turma === 'Todas' ? '' : filtros.turma.toLowerCase();
                                                const sugestoes = (infoBase?.turmas ?? [])
                                                    .filter((t: string) => t.toLowerCase().includes(termo))
                                                    .slice(0, 5);
                                                return (
                                                    <ul className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden p-1">
                                                        <li
                                                            onMouseDown={() => {
                                                                 definirFiltros({ ...filtros, turma: 'Todas' });
                                                                 definirMostrarDropdownTurma(false);
                                                            }}
                                                            className="px-4 py-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer rounded-2xl flex items-center justify-between"
                                                        >
                                                            Geral (Toda Escola)
                                                            {filtros.turma === 'Todas' && <CheckCircle2 size={14} className="text-eletrico" />}
                                                        </li>
                                                        {sugestoes.map((t: string) => (
                                                            <li
                                                                key={t}
                                                                onMouseDown={() => {
                                                                    definirFiltros({ ...filtros, turma: t });
                                                                    definirMostrarDropdownTurma(false);
                                                                }}
                                                                className="px-4 py-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer rounded-2xl"
                                                            >
                                                                {t}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Resumo Discreto */}
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                                        <Info size={16} className="text-slate-300 shrink-0" />
                                        <p className="text-[11px] font-medium text-slate-500">
                                            O PDF incluirá <span className="text-slate-800 font-bold">{quantidadeAlunosPrevista} alunos</span> • 
                                            <span className="text-slate-800 font-bold ml-1">{filtros.turma === 'Todas' ? 'Toda Instituição' : `Turma ${filtros.turma}`}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer do Painel - Ação Principal */}
                            <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        Documento PDF • Padrão A4
                                    </div>
                                </div>

                                <button
                                    onClick={relatorioSelecionado.acao}
                                    disabled={carregandoBase}
                                    className="inline-flex items-center gap-3 text-[10px] font-bold text-white bg-slate-800 hover:bg-slate-900 px-8 py-3.5 rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                                >
                                    Gerar Relatório
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                            <FileSpreadsheet size={32} className="text-slate-300 mb-4" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selecione um Módulo</h3>
                        </div>
                    )}
                </div>
            </div>
        </LayoutAdministrativo>
    );
}

