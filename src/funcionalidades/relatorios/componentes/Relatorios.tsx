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
    Info,
    BarChart2,
    ShieldCheck,
    Search
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
 * Dashboard "Bureau de Inteligência".
 * Central de extração estratégica de dados e geração de documentos oficiais (PDF)
 * com suporte a filtragem multidimensional e auditoria de exportação.
 */
export default function Relatorios() {
    const { podeVerLogs } = usarPermissoes();
    const ANO_ATUAL = new Date().getFullYear();

    /**
     * Calcula as datas de início e fim baseadas no ano e semestre selecionados.
     * @param ano - Ano letivo
     * @param semestre - 1º ou 2º semestre
     * @returns Objeto com datas ISO 8601
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

    // Consulta de turmas e contagem de alunos para o resumo operacional
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

            return {
                turmas: idsTurmas,
                totalAlunos: listaAlunos.length,
                alunos: listaAlunos
            };
        },
        { staleTime: 5 * 60 * 1000 }
    );

    /**
     * Aciona o motor de geração de PDF para o relatório solicitado.
     * @param tipo - Categoria do relatório (Frequência, Evasão, etc)
     */
    const gerarDocumento = async (tipo: string) => {
        const idAviso = toast.loading(`Compilando diretiva: ${tipo}...`);
        try {
            const relatoriosEspeciais = [
                'Risco de Evasão', 
                'Ata de Fechamento', 
                'Divergência de Turno', 
                'Atrasos e Janelas', 
                'Log de Auditoria'
            ];

            if (relatoriosEspeciais.includes(tipo)) {
                await relatorioServico.gerarRelatorioEspecial(tipo, filtros);
            } else {
                const dados = await relatorioServico.obterDadosFiltrados(filtros);
                if (dados.length === 0) throw new Error('Nenhum registro localizado no radar selecionado.');
                relatorioServico.gerarPDF(dados, `Relatório de ${tipo}`, filtros);
            }

            await Registrador.registrar('EXPORTAR_RELATORIO', 'relatorio', tipo, { filtros, formato: 'PDF' });
            toast.success('Compilação finalizada com sucesso', { id: idAviso });
        } catch (erro: any) {
            registrar.erro('Falha na exportação', { tipo, erro: erro.message });
            toast.error(erro.message || 'Falha técnica na compilação do rastro.', { id: idAviso });
        }
    };

    /** Catálogo de módulos analíticos disponíveis no sistema */
    const MODULOS_ANALITICOS = useMemo(() => [
        {
            id: 'frequencia',
            titulo: 'Frequência Diária',
            descricao: 'Monitoramento detalhado de eventos cronológicos (entradas e saídas). Ideal para controle de portaria e verificação de presença em tempo real.',
            icone: Clock,
            distintivoSigla: 'Cronologia',
            corFundo: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            corIcone: 'bg-emerald-50 text-emerald-600',
            gradienteEfeito: 'from-emerald-500/10 to-transparent',
            acao: () => gerarDocumento('Frequência Diária'),
        },
        {
            id: 'fechamento',
            titulo: 'Ata de Fechamento',
            descricao: 'Documento consolidado de frequência mensal. Essencial para fechamento de diários de classe e comprovação institucional acadêmica.',
            icone: FileSpreadsheet,
            distintivoSigla: 'Acadêmico',
            corFundo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
            corIcone: 'bg-indigo-50 text-indigo-600',
            gradienteEfeito: 'from-indigo-500/10 to-transparent',
            acao: () => gerarDocumento('Ata de Fechamento'),
        },
        {
            id: 'evasao',
            titulo: 'Risco de Evasão',
            descricao: 'Análise preditiva baseada em déficit de frequência. Identifica alunos com padrões de abandono escolar para intervenção pedagógica.',
            icone: BarChart2,
            distintivoSigla: 'Inteligência',
            corFundo: 'bg-rose-50 text-rose-600 border-rose-100',
            corIcone: 'bg-rose-50 text-rose-600',
            gradienteEfeito: 'from-rose-500/10 to-transparent',
            acao: () => gerarDocumento('Risco de Evasão'),
        },
        {
            id: 'atrasos',
            titulo: 'Atrasos e Janelas',
            descricao: 'Mapeamento de anomalias temporais. Identifica alunos que chegaram após o horário ou transitaram durante períodos de aula.',
            icone: Clock,
            distintivoSigla: 'Disciplina',
            corFundo: 'bg-amber-50 text-amber-600 border-amber-100',
            corIcone: 'bg-amber-50 text-amber-600',
            gradienteEfeito: 'from-amber-500/10 to-transparent',
            acao: () => gerarDocumento('Atrasos e Janelas'),
        },
        {
            id: 'divergencia',
            titulo: 'Divergência de Turno',
            descricao: 'Auditoria de segurança de acesso. Detecta batidas de ponto em horários incompatíveis com o turno de matrícula cadastrado.',
            icone: ShieldCheck,
            distintivoSigla: 'Segurança',
            corFundo: 'bg-slate-900/5 text-slate-900 border-slate-200',
            corIcone: 'bg-slate-100 text-slate-800',
            gradienteEfeito: 'from-slate-500/10 to-transparent',
            acao: () => gerarDocumento('Divergência de Turno'),
        },
        ...(podeVerLogs ? [{
            id: 'auditoria',
            titulo: 'Logs de Auditoria',
            descricao: 'Rastro técnico de integridade. Histórico completo de operações críticas realizadas no sistema por usuários administrativos.',
            icone: ShieldCheck,
            distintivoSigla: 'Sistemas',
            corFundo: 'bg-slate-100 text-slate-500 border-slate-200',
            corIcone: 'bg-slate-50 text-slate-400',
            gradienteEfeito: 'from-slate-400/5 to-transparent',
            acao: () => gerarDocumento('Log de Auditoria'),
        }] : []),
    ], [podeVerLogs]);

    const [moduloAtivo, definirModuloAtivo] = useState(MODULOS_ANALITICOS[0]);

    // Cálculo dinâmico para o resumo operacional
    const totalAlunosPrevistos = useMemo(() => {
        if (!informacoesBase || !informacoesBase.alunos) return 0;
        if (filtros.turma === 'Todas') return informacoesBase.alunos.length;
        return informacoesBase.alunos.filter((a: any) => a.turma_id === filtros.turma).length;
    }, [filtros.turma, informacoesBase]);

    return (
        <LayoutAdministrativo
            titulo="Bureau de Inteligência"
            subtitulo="Configuração e extração estratégica de dados em alta fidelidade"
            acoes={null}
        >
            <div className="flex flex-1 gap-8 min-h-0 overflow-hidden pb-8">
                
                {/* --- MENU MASTER (CATÁLOGO LUXURY 2XL) --- */}
                <div className="w-[340px] flex flex-col bg-white/40 backdrop-blur-3xl border border-slate-200/60 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                    {/* Header do Menu */}
                    <div className="p-8 pb-4">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] leading-none">Módulos Analíticos</h3>
                        </div>
                    </div>

                    {/* Lista de Módulos */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-6 space-y-3">
                        {MODULOS_ANALITICOS.map((item) => {
                            const Icone = item.icone;
                            const estaSelecionado = moduloAtivo?.id === item.id;
                            
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => definirModuloAtivo(item)}
                                    className={`
                                        w-full p-4 rounded-[1.8rem] transition-all duration-500 text-left relative overflow-hidden group
                                        ${estaSelecionado 
                                            ? 'bg-slate-900 text-white shadow-[0_20px_40px_rgba(0,0,0,0.2)] scale-[1.02] border-none' 
                                            : 'hover:bg-white/70 text-slate-400 hover:text-slate-600 border border-transparent'}
                                    `}
                                >
                                    {/* Efeito Glow no Selecionado */}
                                    {estaSelecionado && (
                                        <div className={`absolute inset-0 bg-gradient-to-br opacity-20 ${item.gradienteEfeito}`} />
                                    )}

                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`
                                            w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
                                            ${estaSelecionado 
                                                ? 'bg-white/10 text-white border border-white/20' 
                                                : `bg-white border border-slate-100 ${item.corIcone} group-hover:scale-105 shadow-sm`}
                                        `}>
                                            <Icone size={20} strokeWidth={2.5} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[11px] font-black tracking-widest uppercase mb-1 truncate ${estaSelecionado ? 'text-white' : 'text-slate-700'}`}>
                                                {item.titulo}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1 h-1 rounded-full ${estaSelecionado ? 'bg-indigo-400' : 'bg-slate-300'}`} />
                                                <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${estaSelecionado ? 'text-indigo-300' : 'text-slate-400'}`}>
                                                    {item.distintivoSigla}
                                                </p>
                                            </div>
                                        </div>

                                        <ArrowRight 
                                            size={14} 
                                            className={`transition-all duration-500 ${estaSelecionado ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} 
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer do Menu */}
                    <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                <ShieldCheck size={14} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest leading-none">Protocolo</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">AES-256 SLL</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Seguro</span>
                        </div>
                    </div>
                </div>

                {/* --- COCKPIT DE CONFIGURAÇÃO (COCKPIT LUXURY 2XL) --- */}
                <div className="flex-1 bg-white border border-slate-200/60 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col relative">
                    {moduloAtivo ? (
                        <>
                            {/* Area de Identidade do Módulo */}
                            <div className="p-12 pb-16 relative overflow-hidden bg-slate-50/30">
                                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                    <moduloAtivo.icone size={200} strokeWidth={1} />
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center gap-10 relative z-10">
                                    <div className={`
                                        w-24 h-24 rounded-[2.2rem] border-4 border-white shadow-2xl flex items-center justify-center 
                                        transition-all duration-700 hover:rotate-6 hover:scale-105 shrink-0
                                        ${moduloAtivo.corIcone}
                                    `}>
                                        <moduloAtivo.icone size={42} strokeWidth={1.5} />
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                                                {moduloAtivo.titulo}
                                            </h2>
                                            <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] border ${moduloAtivo.corFundo} shadow-sm backdrop-blur-sm`}>
                                                {moduloAtivo.distintivoSigla}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                            <Info size={14} className="text-indigo-500" />
                                            Diretiva Acadêmica Baseada em Rastro Digital
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-12 bg-white/80 backdrop-blur-md rounded-[2rem] p-8 border border-white shadow-xl max-w-3xl border-l-[6px] border-l-slate-900">
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed italic">
                                        "{moduloAtivo.descricao}"
                                    </p>
                                </div>
                            </div>

                            {/* Área de Parâmetros de Filtro */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 py-8 space-y-12">
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    
                                    {/* SEÇÃO: CRONOLOGIA */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Janela Temporal de Extração</label>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2.5 rounded-[1.8rem] border border-slate-100 shadow-inner">
                                                {[ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1].map((ano) => (
                                                    <button
                                                        key={ano}
                                                        onClick={() => {
                                                            const periodo = calcularPeriodo(ano, filtros.semestre);
                                                            definirFiltros({ ...filtros, anoLetivo: ano, ...periodo });
                                                        }}
                                                        className={`
                                                            h-12 rounded-[1.2rem] text-[11px] font-black uppercase tracking-widest transition-all duration-300
                                                            ${filtros.anoLetivo === ano 
                                                                ? 'bg-slate-900 text-white shadow-xl scale-105 border-none' 
                                                                : 'text-slate-400 hover:text-slate-700 hover:bg-white'}
                                                        `}
                                                    >
                                                        {ano}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-[1.8rem] border border-slate-100 shadow-inner">
                                                {([1, 2] as const).map((sem) => (
                                                    <button
                                                        key={sem}
                                                        onClick={() => {
                                                            const periodo = calcularPeriodo(filtros.anoLetivo, sem);
                                                            definirFiltros({ ...filtros, semestre: sem, ...periodo });
                                                        }}
                                                        className={`
                                                            h-12 rounded-[1.2rem] text-[11px] font-black uppercase tracking-widest transition-all duration-300
                                                            ${filtros.semestre === sem 
                                                                ? 'bg-slate-900 text-white shadow-xl scale-105 border-none' 
                                                                : 'text-slate-400 hover:text-slate-700 hover:bg-white'}
                                                        `}
                                                    >
                                                        {sem}º Semestre
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SEÇÃO: PERÍMETRO TURMA */}
                                    <div className="space-y-6" ref={refDropdownTurma}>
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Foco de Observação (Unidade)</label>
                                        </div>

                                        <div className="relative group/input">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-slate-900 transition-all">
                                                <Search size={22} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="BUSCAR TURMA OU RADAR GERAL..."
                                                onFocus={() => definirMostrarSelecaoTurma(true)}
                                                onBlur={() => setTimeout(() => definirMostrarSelecaoTurma(false), 250)}
                                                onChange={(e) => definirFiltros({ ...filtros, turma: e.target.value || 'Todas' })}
                                                value={filtros.turma === 'Todas' ? '' : filtros.turma}
                                                className="w-full h-20 pl-16 pr-16 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-sm font-black text-slate-900 uppercase tracking-widest outline-none transition-all focus:bg-white focus:border-slate-900 focus:shadow-2xl focus:scale-[1.01] placeholder:text-slate-300"
                                            />
                                            
                                            {mostrarSelecaoTurma && (() => {
                                                const termo = filtros.turma === 'Todas' ? '' : filtros.turma.toLowerCase();
                                                const sugestoes = (informacoesBase?.turmas ?? [])
                                                    .filter((t: string) => t.toLowerCase().includes(termo))
                                                    .slice(0, 5);
                                                
                                                return (
                                                    <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white border border-slate-200 rounded-[2.2rem] shadow-[0_30px_60px_rgba(0,0,0,0.25)] z-[60] overflow-hidden p-3 animate-fade-in-up">
                                                        <button
                                                            onMouseDown={() => {
                                                                definirFiltros({ ...filtros, turma: 'Todas' });
                                                                definirMostrarSelecaoTurma(false);
                                                            }}
                                                            className={`
                                                                w-full px-6 py-5 text-[11px] font-black rounded-2xl flex items-center justify-between transition-all uppercase tracking-widest mb-1
                                                                ${filtros.turma === 'Todas' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}
                                                            `}
                                                        >
                                                            <span>Radar Geral da Escola</span>
                                                            <CheckCircle2 size={18} className={filtros.turma === 'Todas' ? 'text-emerald-400' : 'opacity-0'} />
                                                        </button>
                                                        <div className="h-px bg-slate-100 my-2 mx-4" />
                                                        {sugestoes.map((turma) => (
                                                            <button
                                                                key={turma}
                                                                onMouseDown={() => {
                                                                    definirFiltros({ ...filtros, turma: turma });
                                                                    definirMostrarSelecaoTurma(false);
                                                                }}
                                                                className={`
                                                                    w-full px-6 py-5 text-[11px] font-black rounded-2xl flex items-center justify-between transition-all uppercase tracking-widest mb-1
                                                                    ${filtros.turma === turma ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}
                                                                `}
                                                            >
                                                                <span>{turma}</span>
                                                                <CheckCircle2 size={18} className={filtros.turma === turma ? 'text-emerald-400' : 'opacity-0'} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </section>

                                {/* DOSSIÊ OPERACIONAL (INSPEÇÃO) */}
                                <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                                    <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                                        <div className="w-20 h-20 bg-white/10 rounded-[1.8rem] border border-white/20 backdrop-blur-md flex items-center justify-center text-indigo-400 shrink-0">
                                            <BarChart2 size={36} />
                                        </div>
                                        
                                        <div className="flex-1 space-y-3 text-center md:text-left">
                                            <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.5em] leading-none mb-4">Inspeção Síncrona</h4>
                                            <div className="flex flex-wrap gap-x-8 gap-y-4 justify-center md:justify-start">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Base Auditável</p>
                                                    <p className="text-xl font-black">{totalAlunosPrevistos} Alunos</p>
                                                </div>
                                                <div className="w-px h-10 bg-white/10 hidden md:block" />
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Localização</p>
                                                    <p className="text-xl font-black truncate max-w-[200px]">{filtros.turma === 'Todas' ? 'GERAL INSTITUIÇÃO' : filtros.turma}</p>
                                                </div>
                                                <div className="w-px h-10 bg-white/10 hidden md:block" />
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Ciclo Operacional</p>
                                                    <p className="text-xl font-black">{filtros.anoLetivo} • {filtros.semestre}ºS</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-emerald-500/20 border border-emerald-500/30 px-6 py-4 rounded-2xl flex items-center gap-4 shrink-0">
                                            <div className="flex flex-col items-end">
                                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Integridade</p>
                                                <p className="text-[11px] font-black text-white uppercase tracking-widest">Validada</p>
                                            </div>
                                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,1)] animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cockpit de Controle Final (Main Action) */}
                            <div className="p-12 pt-8 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-8">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                                            <Download size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] leading-none mb-1">Criptografia Ativa</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Renderização PDF em 300 DPI</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={moduloAtivo.acao}
                                    disabled={carregandoBase}
                                    className="
                                        group relative h-20 px-12 rounded-[1.8rem] bg-slate-900 text-white transition-all duration-500
                                        hover:bg-black hover:shadow-[0_25px_50px_rgba(0,0,0,0.35)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 overflow-hidden
                                    "
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <div className="flex items-center gap-6 relative z-10">
                                        <span className="text-[12px] font-black uppercase tracking-[0.4em]">Compilar Documento</span>
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:translate-x-2 transition-all">
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center relative">
                            <div className="relative p-16 bg-white border-4 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-center shadow-inner">
                                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-10 border border-white shadow-xl">
                                    <FileSpreadsheet size={48} strokeWidth={1} />
                                </div>
                                <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.6em] mb-4 text-center">Protocolo de Bureau</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] max-w-xs text-center border-t border-slate-50 pt-6">Selecione uma diretiva no catálogo à esquerda para iniciar o processamento de dados.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </LayoutAdministrativo>
    );
}



