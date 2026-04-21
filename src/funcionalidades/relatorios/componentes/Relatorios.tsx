import { useState, useRef, useMemo } from 'react';
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
    ArrowRight,
    CheckCircle2,
    BarChart2,
    ShieldCheck,
    ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { relatorioServico } from '../servicos/relatorioServico';

const registrar = criarRegistrador('Relatorios');

/**
 * Interface para os filtros de extração de relatórios.
 */
interface FiltrosRelatorio {
    anoLetivo: number;
    semestre: 1 | 2;
    dataInicio: string;
    dataFim: string;
    turma: string;
}

/**
 * Interface para os dados base carregados do servidor.
 */
interface InformacoesBase {
    turmas: string[];
    totalAlunos: number;
    alunos: any[];
}

/**
 * Página de Relatórios — design minimalista.
 * Geração de documentos PDF com filtragem por período e turma.
 */
export default function Relatorios() {
    const { podeVerLogs } = usarPermissoes();
    const ANO_ATUAL = new Date().getFullYear();

    /**
     * Calcula as datas de início e fim baseadas no ano e semestre.
     * @param ano - Ano letivo
     * @param semestre - 1º ou 2º semestre
     */
    const calcularPeriodo = (ano: number, semestre: 1 | 2): { dataInicio: string; dataFim: string } => {
        if (semestre === 1) return { dataInicio: `${ano}-01-01`, dataFim: `${ano}-06-30` };
        return { dataInicio: `${ano}-07-01`, dataFim: `${ano}-12-31` };
    };

    const [filtros, definirFiltros] = useState<FiltrosRelatorio>(() => {
        const semestreAtual = new Date().getMonth() < 6 ? 1 : 2;
        return {
            anoLetivo: ANO_ATUAL,
            semestre: semestreAtual as 1 | 2,
            ...calcularPeriodo(ANO_ATUAL, semestreAtual as 1 | 2),
            turma: 'Todas'
        };
    });

    const [mostrarSelecaoTurma, definirMostrarSelecaoTurma] = useState(false);
    const refDropdownTurma = useRef<HTMLDivElement>(null);

    const { dados: informacoesBase = { turmas: [], totalAlunos: 0, alunos: [] } as InformacoesBase, carregando: carregandoBase } = usarConsulta(
        ['info-base-relatorios-online'],
        async () => {
            const [alunos, turmas] = await Promise.all([
                api.obter<any[]>('/academico/alunos'),
                api.obter<any[]>('/academico/turmas')
            ]);
            const listaAlunos = alunos || [];
            const listaTurmas = turmas || [];
            const idsTurmas = listaTurmas.length > 0
                ? listaTurmas.map((t: any) => t.id).sort()
                : [...new Set(listaAlunos.map((a: any) => a.turma_id).filter((t: any) => t))].sort();
            return { turmas: idsTurmas, totalAlunos: listaAlunos.length, alunos: listaAlunos };
        },
        { staleTime: 5 * 60 * 1000 }
    );

    /**
     * Aciona o motor de geração de PDF para o relatório solicitado.
     * @param tipo - Categoria do relatório
     */
    const gerarDocumento = async (tipo: string) => {
        const idAviso = toast.loading(`Gerando ${tipo}...`);
        try {
            const relatoriosEspeciais = ['Risco de Evasão', 'Ata de Fechamento', 'Divergência de Turno', 'Atrasos e Janelas', 'Log de Auditoria'];
            if (relatoriosEspeciais.includes(tipo)) {
                await relatorioServico.gerarRelatorioEspecial(tipo, filtros);
            } else {
                const dados = await relatorioServico.obterDadosFiltrados(filtros);
                if (dados.length === 0) throw new Error('Nenhum registro encontrado para os filtros selecionados.');
                relatorioServico.gerarPDF(dados, `Relatório de ${tipo}`, filtros);
            }
            await Registrador.registrar('EXPORTAR_RELATORIO', 'relatorio', tipo, { filtros, formato: 'PDF' });
            toast.success('Documento gerado com sucesso', { id: idAviso });
        } catch (erro: any) {
            registrar.erro('Falha na exportação', { tipo, erro: erro.message });
            toast.error(erro.message || 'Falha ao gerar o documento.', { id: idAviso });
        }
    };

    /** Catálogo de relatórios disponíveis */
    const MODULOS = useMemo(() => [
        {
            id: 'frequencia',
            titulo: 'Frequência Diária',
            descricao: 'Entradas e saídas por aluno em um período.',
            icone: Clock,
            cor: 'text-emerald-600 bg-emerald-50',
            acao: () => gerarDocumento('Frequência Diária'),
        },
        {
            id: 'fechamento',
            titulo: 'Ata de Fechamento',
            descricao: 'Frequência consolidada para fechamento de diários.',
            icone: FileSpreadsheet,
            cor: 'text-indigo-600 bg-indigo-50',
            acao: () => gerarDocumento('Ata de Fechamento'),
        },
        {
            id: 'evasao',
            titulo: 'Risco de Evasão',
            descricao: 'Alunos com déficit de presença e risco de abandono.',
            icone: BarChart2,
            cor: 'text-rose-600 bg-rose-50',
            acao: () => gerarDocumento('Risco de Evasão'),
        },
        {
            id: 'atrasos',
            titulo: 'Atrasos e Janelas',
            descricao: 'Mapeamento de entradas tardias e trânsito irregular.',
            icone: Clock,
            cor: 'text-amber-600 bg-amber-50',
            acao: () => gerarDocumento('Atrasos e Janelas'),
        },
        {
            id: 'divergencia',
            titulo: 'Divergência de Turno',
            descricao: 'Acessos incompatíveis com o turno de matrícula.',
            icone: ShieldCheck,
            cor: 'text-slate-600 bg-slate-100',
            acao: () => gerarDocumento('Divergência de Turno'),
        },
        ...(podeVerLogs ? [{
            id: 'auditoria',
            titulo: 'Logs de Auditoria',
            descricao: 'Histórico de operações administrativas no sistema.',
            icone: ShieldCheck,
            cor: 'text-slate-500 bg-slate-50',
            acao: () => gerarDocumento('Log de Auditoria'),
        }] : []),
    ], [podeVerLogs]);

    const [moduloAtivo, definirModuloAtivo] = useState(MODULOS[0]);

    const totalAlunosPrevistos = useMemo(() => {
        if (!informacoesBase?.alunos) return 0;
        if (filtros.turma === 'Todas') return informacoesBase.alunos.length;
        return informacoesBase.alunos.filter((a: any) => a.turma_id === filtros.turma).length;
    }, [filtros.turma, informacoesBase]);

    // Necessário: JSX exige constante com inicial maiúscula para componentes dinâmicos
    const IconeAtivo = moduloAtivo.icone;

    return (
        <LayoutAdministrativo
            titulo="Relatórios"
            subtitulo="Gere e exporte dados acadêmicos e de acesso em alta fidelidade"
            acoes={null}
        >
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 h-full pb-8">

                {/* COLUNA ESQUERDA — Lista de módulos */}
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 ml-1">
                        Tipo de Relatório
                    </p>
                    {MODULOS.map((item) => {
                        const Icone = item.icone;
                        const ativo = moduloAtivo?.id === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => definirModuloAtivo(item)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all
                                    ${ativo
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }
                                `}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${ativo ? 'bg-white/10' : item.cor}`}>
                                    <Icone size={15} strokeWidth={2} />
                                </div>
                                <span className="text-[12px] font-bold truncate">{item.titulo}</span>
                                {ativo && <ArrowRight size={14} className="ml-auto shrink-0 opacity-60" />}
                            </button>
                        );
                    })}
                </div>

                {/* COLUNA DIREITA — Configuração e ação */}
                <div className="flex flex-col gap-6">

                    {/* Cabeçalho do módulo selecionado */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <div className="flex items-start gap-4 mb-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${moduloAtivo.cor}`}>
                                <IconeAtivo size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">{moduloAtivo.titulo}</h2>
                                <p className="text-[12px] text-slate-400 mt-0.5">{moduloAtivo.descricao}</p>
                            </div>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Filtros</p>

                        {/* Ano */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-600">Ano letivo</label>
                            <div className="flex gap-2">
                                {[ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1].map((ano) => (
                                    <button
                                        key={ano}
                                        onClick={() => {
                                            const periodo = calcularPeriodo(ano, filtros.semestre);
                                            definirFiltros({ ...filtros, anoLetivo: ano, ...periodo });
                                        }}
                                        className={`flex-1 h-9 rounded-lg text-[11px] font-bold transition-all
                                            ${filtros.anoLetivo === ano
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {ano}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Semestre */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-600">Semestre</label>
                            <div className="flex gap-2">
                                {([1, 2] as const).map((sem) => (
                                    <button
                                        key={sem}
                                        onClick={() => {
                                            const periodo = calcularPeriodo(filtros.anoLetivo, sem);
                                            definirFiltros({ ...filtros, semestre: sem, ...periodo });
                                        }}
                                        className={`flex-1 h-9 rounded-lg text-[11px] font-bold transition-all
                                            ${filtros.semestre === sem
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {sem}º Semestre
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Turma */}
                        <div className="space-y-2" ref={refDropdownTurma}>
                            <label className="text-[11px] font-bold text-slate-600">Turma</label>
                            <div className="relative">
                                <button
                                    onClick={() => definirMostrarSelecaoTurma(!mostrarSelecaoTurma)}
                                    className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-left flex items-center justify-between text-[12px] font-bold text-slate-700 hover:border-slate-300 transition-all"
                                >
                                    <span>{filtros.turma === 'Todas' ? 'Todas as turmas' : filtros.turma}</span>
                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${mostrarSelecaoTurma ? 'rotate-180' : ''}`} />
                                </button>

                                {mostrarSelecaoTurma && (() => {
                                    const sugestoes = (informacoesBase?.turmas ?? []).slice(0, 8);
                                    return (
                                        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                                            <button
                                                onMouseDown={() => { definirFiltros({ ...filtros, turma: 'Todas' }); definirMostrarSelecaoTurma(false); }}
                                                className={`w-full px-4 py-2.5 text-[12px] font-bold flex items-center justify-between transition-all
                                                    ${filtros.turma === 'Todas' ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                Todas as turmas
                                                {filtros.turma === 'Todas' && <CheckCircle2 size={14} className="text-emerald-500" />}
                                            </button>
                                            <div className="h-px bg-slate-100 mx-3" />
                                            {sugestoes.map((turma) => (
                                                <button
                                                    key={turma}
                                                    onMouseDown={() => { definirFiltros({ ...filtros, turma }); definirMostrarSelecaoTurma(false); }}
                                                    className={`w-full px-4 py-2.5 text-[12px] font-bold flex items-center justify-between transition-all
                                                        ${filtros.turma === turma ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                                                >
                                                    {turma}
                                                    {filtros.turma === turma && <CheckCircle2 size={14} className="text-emerald-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Resumo e ação */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-6 text-slate-500">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alunos</p>
                                <p className="text-xl font-bold text-slate-900">{totalAlunosPrevistos}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-100" />
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Turma</p>
                                <p className="text-sm font-bold text-slate-900 truncate max-w-[160px]">
                                    {filtros.turma === 'Todas' ? 'Todas' : filtros.turma}
                                </p>
                            </div>
                            <div className="w-px h-8 bg-slate-100" />
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Período</p>
                                <p className="text-sm font-bold text-slate-900">{filtros.anoLetivo} · {filtros.semestre}º Sem.</p>
                            </div>
                        </div>

                        <button
                            onClick={moduloAtivo.acao}
                            disabled={carregandoBase}
                            className="flex items-center gap-3 px-6 h-11 bg-slate-900 text-white rounded-xl text-[12px] font-bold hover:bg-black transition-all disabled:opacity-40 active:scale-95 shrink-0"
                        >
                            <Download size={15} />
                            Gerar PDF
                        </button>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
