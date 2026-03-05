import { useState, useRef, useEffect, useMemo } from 'react';
import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { usarPermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';

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

    // Consulta de turmas e contagem de alunos para o resumo
    const { dados: infoBase = { turmas: [], totalAlunos: 0, alunos: [] }, carregando: carregandoBase } = usarConsulta(
        ['info-base-relatorios'],
        async () => {
            const banco = await bancoLocal.iniciarBanco();
            const [alunos, turmas] = await Promise.all([
                banco.getAll('alunos'),
                banco.getAll('turmas')
            ]);

            const turmasIds = turmas.length > 0
                ? turmas.map((t: any) => t.id).sort()
                : [...new Set(alunos.map((a: any) => a.turma_id).filter((t: any) => t))].sort();

            return {
                turmas: turmasIds,
                totalAlunos: alunos.length,
                alunos
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
            badgeCor: 'bg-blue-50 text-blue-600 border-blue-100',
            iconeCor: 'bg-blue-50 text-blue-500',
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
                <div className="w-80 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-suave">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 pt-4">
                        {CARDS_RELATORIO.map((item, idx) => {
                            const Icone = item.icone;
                            const estaSelecionado = relatorioSelecionado?.titulo === item.titulo;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => definirRelatorioSelecionado(item)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group ${estaSelecionado
                                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                        : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'
                                        }`}
                                >
                                    <div className={`p-2 rounded-xl border shrink-0 transition-colors ${estaSelecionado
                                        ? 'bg-slate-800 border-slate-700 text-sky-400'
                                        : 'bg-white border-slate-100 text-slate-400 group-hover:text-slate-600 shadow-suave'
                                        }`}>
                                        <Icone size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black tracking-tight truncate flex items-center gap-1.5 uppercase">
                                            {item.titulo}
                                        </p>
                                        <p className={`text-[9px] font-medium truncate ${estaSelecionado ? 'text-slate-400' : 'text-slate-400'}`}>
                                            {item.badgeTxt}
                                        </p>
                                    </div>
                                    {estaSelecionado && <ArrowRight size={14} className="text-white/50" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {CARDS_RELATORIO.length} Módulo{CARDS_RELATORIO.length !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                Sistema Ativo
                            </span>
                        </div>
                    </div>
                </div>

                {/* Detail: Painel de Configuração */}
                <div className="flex-1 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-suave flex flex-col relative">
                    {relatorioSelecionado ? (
                        <>
                            {/* Header do Detalhe */}
                            <div className="p-8 border-b border-slate-100 bg-slate-50/20">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-2xl border border-slate-100 shadow-suave ${relatorioSelecionado.iconeCor}`}>
                                            <relatorioSelecionado.icone size={32} strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                                {relatorioSelecionado.titulo}
                                            </h2>
                                            <span className={`inline-block mt-1 text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border shadow-suave ${relatorioSelecionado.badgeCor}`}>
                                                {relatorioSelecionado.badgeTxt}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status do Módulo</p>
                                        <div className="flex items-center gap-2 justify-end text-emerald-600 font-bold text-[11px]">
                                            <CheckCircle2 size={12} />
                                            Pronto para exportação
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-2xl">
                                    {relatorioSelecionado.descricao}
                                </p>
                            </div>

                            {/* Área de Filtros e Parâmetros */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                <div className="max-w-3xl space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Ano Letivo */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 ml-1">
                                                <Calendar size={14} className="text-slate-400" />
                                                Ano Letivo
                                            </div>
                                            <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100 h-12">
                                                {[anoAtual - 1, anoAtual, anoAtual + 1].map((ano) => (
                                                    <button
                                                        key={ano}
                                                        onClick={() => {
                                                            const periodo = calcularPeriodo(ano, filtros.semestre);
                                                            definirFiltros({ ...filtros, anoLetivo: ano, ...periodo });
                                                        }}
                                                        className={`flex-1 h-full rounded-xl text-[11px] font-bold transition-all ${filtros.anoLetivo === ano
                                                            ? 'bg-white text-slate-900 shadow-media border border-slate-100'
                                                            : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        {ano}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Semestre */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 ml-1">
                                                <Clock size={14} className="text-slate-400" />
                                                Período
                                            </div>
                                            <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100 h-12">
                                                {([1, 2] as const).map((sem) => (
                                                    <button
                                                        key={sem}
                                                        onClick={() => {
                                                            const periodo = calcularPeriodo(filtros.anoLetivo, sem);
                                                            definirFiltros({ ...filtros, semestre: sem, ...periodo });
                                                        }}
                                                        className={`flex-1 h-full rounded-xl text-[11px] font-bold transition-all ${filtros.semestre === sem
                                                            ? 'bg-white text-slate-900 shadow-media border border-slate-100'
                                                            : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        {sem}º semestre
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Turma */}
                                    <div className="space-y-4" ref={refDropdownTurma}>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 ml-1">
                                            <Layers size={14} className="text-slate-400" />
                                            Filtro por Turma
                                        </div>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                placeholder="Deixe vazio para visualizar todas as turmas..."
                                                onFocus={() => definirMostrarDropdownTurma(true)}
                                                onBlur={() => setTimeout(() => definirMostrarDropdownTurma(false), 200)}
                                                onChange={(e) => definirFiltros({ ...filtros, turma: e.target.value || 'Todas' })}
                                                value={filtros.turma === 'Todas' ? '' : filtros.turma}
                                                className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border border-slate-100 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 rounded-2xl text-xs font-bold text-slate-700 outline-none transition-all"
                                            />
                                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:rotate-180 transition-transform" />

                                            {mostrarDropdownTurma && (() => {
                                                const termo = filtros.turma === 'Todas' ? '' : filtros.turma.toLowerCase();
                                                const sugestoes = (infoBase?.turmas ?? [])
                                                    .filter((t: string) => t.toLowerCase().includes(termo))
                                                    .slice(0, 5);
                                                return (
                                                    <ul className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-zoom-in p-2 ring-1 ring-black/5">
                                                        <li
                                                            onMouseDown={() => {
                                                                definirFiltros({ ...filtros, turma: 'Todas' });
                                                                definirMostrarDropdownTurma(false);
                                                            }}
                                                            className="px-4 py-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors rounded-xl flex items-center justify-between group"
                                                        >
                                                            Geral (Toda a instituição)
                                                            {filtros.turma === 'Todas' && <CheckCircle2 size={16} className="text-slate-900" />}
                                                        </li>
                                                        {sugestoes.map((t: string) => (
                                                            <li
                                                                key={t}
                                                                onMouseDown={() => {
                                                                    definirFiltros({ ...filtros, turma: t });
                                                                    definirMostrarDropdownTurma(false);
                                                                }}
                                                                className="px-4 py-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors rounded-xl flex items-center justify-between group"
                                                            >
                                                                {t}
                                                                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0" />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Mini-Resumo Dinâmico (Preenchimento de Espaço) */}
                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-start gap-4 mt-6">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-suave border border-slate-100 shrink-0">
                                            <Info size={18} />
                                        </div>
                                        <div className="flex-1 mt-0.5">
                                            <p className="text-[11px] font-bold text-slate-500 mb-1">Prévia do Documento</p>
                                            <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                                Este relatório incluirá <span className="text-slate-900 font-bold">{quantidadeAlunosPrevista} alunos</span> do <span className="text-slate-900 font-bold">{filtros.semestre}º semestre</span> de <span className="text-slate-900 font-bold">{filtros.anoLetivo}</span>
                                                {filtros.turma !== 'Todas' ? (
                                                    <> da turma <span className="text-slate-900 font-bold">{filtros.turma}</span></>
                                                ) : (
                                                    <> de toda a instituição</>
                                                )}.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer do Painel - Ação Principal */}
                            <div className="p-8 border-t border-slate-100 bg-slate-50/10 flex items-center justify-between">
                                <div className="flex items-center gap-4 text-slate-400">
                                    <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-suave">
                                        <Download size={14} />
                                    </div>
                                    <div className="text-[10px] font-semibold leading-tight text-slate-500">
                                        Formato de Saída<br />
                                        <span className="text-slate-900 font-bold">Documento PDF Oficial</span>
                                    </div>
                                </div>

                                <button
                                    onClick={relatorioSelecionado.acao}
                                    disabled={carregandoBase}
                                    className="inline-flex items-center gap-3 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 px-10 py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                                >
                                    GERAR RELATÓRIO AGORA
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-50">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                                <FileSpreadsheet size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-500 mb-2">Selecione um Módulo</h3>
                            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                                Utilize a lista lateral para escolher o documento que deseja configurar e exportar.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </LayoutAdministrativo>
    );
}

