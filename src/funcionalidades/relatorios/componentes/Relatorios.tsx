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
    ShieldCheck,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { relatorioServico } from '../servicos/relatorioServico';

const log = criarRegistrador('Relatorios');

/**
 * Dashboard de extração de relatórios e inteligência de dados.
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
    const calcularPeriodo = (ano: number, semestre: 1 | 2) => {
        if (semestre === 1) return { dataInicio: `${ano}-01-01`, dataFim: `${ano}-06-30` };
        return { dataInicio: `${ano}-07-01`, dataFim: `${ano}-12-31` };
    };

    const [filtros, definirFiltros] = useState(() => {
        const semestre = new Date().getMonth() < 6 ? 1 : 2;
        return { anoLetivo: ANO_ATUAL, semestre: semestre as 1 | 2, ...calcularPeriodo(ANO_ATUAL, semestre as 1 | 2), turma: 'Todas' };
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

    /**
     * Aciona o motor de geração de PDF para o relatório solicitado.
     * @param tipo - Categoria do relatório (Frequência, Evasão, etc)
     */
    const gerarRelatorio = async (tipo: string) => {
        const idAviso = toast.loading(`Compilando rastro: ${tipo}...`);
        try {
            const relatoriosEspeciais = [
                'Risco de Evasão', 
                'Fechamento Mensal', 
                'Divergência de Turno', 
                'Atrasos e Janelas', 
                'Log de Auditoria'
            ];

            if (relatoriosEspeciais.includes(tipo)) {
                await relatorioServico.gerarRelatorioEspecial(tipo, filtros);
            } else {
                const dados = await relatorioServico.obterDadosFiltrados(filtros);
                if (dados.length === 0) throw new Error('Nenhum rastro localizado para o perímetro selecionado.');
                relatorioServico.gerarPDF(dados, `Relatório de ${tipo}`, filtros);
            }

            await Registrador.registrar('EXPORTAR_RELATORIO', 'relatorio', tipo, { filtros, formato: 'PDF' });
            toast.success('Documento compilado com sucesso', { id: idAviso });
        } catch (e: any) {
            console.error('[Relatorios] Falha na exportação:', { tipo, erro: e.message });
            toast.error(e.message || 'Falha na compilação do rastro.', { id: idAviso });
        }
    };

    const CARDS_RELATORIO = [
        {
            id: 'frequencia',
            titulo: 'Frequência Diária',
            descricao: 'Monitoramento detalhado de eventos cronológicos (entradas e saídas). Ideal para controle de portaria, verificação de presença em tempo real e relatórios de fluxo diário.',
            icone: Clock,
            badgeTxt: 'Cronologia',
            badgeCor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            iconeCor: 'bg-emerald-50 text-emerald-600',
            gradiente: 'from-emerald-500/10 to-transparent',
            acao: () => gerarRelatorio('Frequência Diária'),
        },
        {
            id: 'fechamento',
            titulo: 'Ata de Fechamento',
            descricao: 'Documento consolidado de frequência mensal. Essencial para fechamento de diários de classe, comprovação institucional e exportação para sistemas de secretaria acadêmica.',
            icone: FileSpreadsheet,
            badgeTxt: 'Acadêmico',
            badgeCor: 'bg-indigo-50 text-indigo-600 border-indigo-100',
            iconeCor: 'bg-indigo-50 text-indigo-600',
            gradiente: 'from-indigo-500/10 to-transparent',
            acao: () => gerarRelatorio('Fechamento Mensal'),
        },
        {
            id: 'evasao',
            titulo: 'Risco de Evasão',
            descricao: 'Análise preditiva baseada em déficit de frequência nos últimos 30 dias. Identifica alunos com padrões de abandono para intervenção imediata do SOE e Coordenação.',
            icone: BarChart2,
            badgeTxt: 'Inteligência',
            badgeCor: 'bg-rose-50 text-rose-600 border-rose-100',
            iconeCor: 'bg-rose-50 text-rose-600',
            gradiente: 'from-rose-500/10 to-transparent',
            acao: () => gerarRelatorio('Risco de Evasão'),
        },
        {
            id: 'atrasos',
            titulo: 'Atrasos e Janelas',
            descricao: 'Relatório de anomalias temporais de acesso. Mapeia alunos que chegaram após o fechamento dos portões ou que transitaram pela portaria durante janelas de aula.',
            icone: Clock,
            badgeTxt: 'Disciplina',
            badgeCor: 'bg-amber-50 text-amber-600 border-amber-100',
            iconeCor: 'bg-amber-50 text-amber-600',
            gradiente: 'from-amber-500/10 to-transparent',
            acao: () => gerarRelatorio('Atrasos e Janelas'),
        },
        {
            id: 'divergencia',
            titulo: 'Divergência de Turno',
            descricao: 'Segurança e Auditoria de Acesso. Detecta alunos que realizaram batidas de ponto em horários incompatíveis com o turno de matrícula cadastrado (ex: aluno matutino entrando à tarde).',
            icone: ShieldCheck,
            badgeTxt: 'Segurança',
            badgeCor: 'bg-slate-900/5 text-slate-900 border-slate-200',
            iconeCor: 'bg-slate-100 text-slate-800',
            gradiente: 'from-slate-500/10 to-transparent',
            acao: () => gerarRelatorio('Divergência de Turno'),
        },
        ...(podeVerLogs ? [{
            id: 'auditoria',
            titulo: 'Auditoria de Acessos',
            descricao: 'Rastro técnico de integridade. Histórico completo de operações realizadas no sistema, incluindo alterações em dados de alunos e logins realizados na plataforma.',
            icone: ShieldCheck,
            badgeTxt: 'Sistemas',
            badgeCor: 'bg-slate-100 text-slate-500 border-slate-200',
            iconeCor: 'bg-slate-50 text-slate-400',
            gradiente: 'from-slate-400/5 to-transparent',
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
                        {CARDS_RELATORIO.map((item, idx) => {
                            const Icone = item.icone;
                            const estaSelecionado = relatorioSelecionado?.id === item.id;
                            
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => definirRelatorioSelecionado(item)}
                                    className={`
                                        w-full p-4 rounded-[1.8rem] transition-all duration-500 text-left relative overflow-hidden group
                                        ${estaSelecionado 
                                            ? 'bg-slate-900 text-white shadow-[0_20px_40px_rgba(0,0,0,0.2)] scale-[1.02] border-none' 
                                            : 'hover:bg-white/70 text-slate-400 hover:text-slate-600 border border-transparent'}
                                    `}
                                >
                                    {/* Efeito Glow no Hover/Seleção */}
                                    {estaSelecionado && (
                                        <div className={`absolute inset-0 bg-gradient-to-br opacity-20 ${item.gradiente}`} />
                                    )}

                                    <div className="flex items-center gap-4 relative z-10">
                                        {/* Container do Ícone */}
                                        <div className={`
                                            w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
                                            ${estaSelecionado 
                                                ? 'bg-white/10 text-white border border-white/20' 
                                                : `bg-white border border-slate-100 ${item.iconeCor} group-hover:scale-105 shadow-sm`}
                                        `}>
                                            <Icone size={20} strokeWidth={2.5} />
                                        </div>

                                        {/* Textos */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[11px] font-black tracking-widest uppercase mb-1 truncate ${estaSelecionado ? 'text-white' : 'text-slate-700'}`}>
                                                {item.titulo}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1 h-1 rounded-full ${estaSelecionado ? 'bg-indigo-400' : 'bg-slate-300'}`} />
                                                <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${estaSelecionado ? 'text-indigo-300' : 'text-slate-400'}`}>
                                                    {item.badgeTxt}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Seta de Indicação */}
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
                                <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest leading-none">Security Core</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">AES-256 Enabled</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Ativo</span>
                        </div>
                    </div>
                </div>

                {/* --- CONSOLE DE DETALHE (COCKPIT LUXURY 2XL) --- */}
                <div className="flex-1 bg-white border border-slate-200/60 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col relative">
                    {relatorioSelecionado ? (
                        <>
                            {/* Area de Banner e Identidade do Relatório */}
                            <div className="p-12 pb-16 relative overflow-hidden bg-slate-50/30">
                                {/* Decorativos de Background */}
                                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                    <relatorioSelecionado.icone size={200} strokeWidth={1} />
                                </div>
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                                <div className="flex flex-col md:flex-row md:items-center gap-10 relative z-10">
                                    <div className={`
                                        w-24 h-24 rounded-[2.2rem] border-4 border-white shadow-2xl flex items-center justify-center 
                                        transition-all duration-700 hover:rotate-[10deg] hover:scale-105 shrink-0
                                        ${relatorioSelecionado.iconeCor}
                                    `}>
                                        <relatorioSelecionado.icone size={42} strokeWidth={1.5} />
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                                                {relatorioSelecionado.titulo}
                                            </h2>
                                            <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] border ${relatorioSelecionado.badgeCor} shadow-sm backdrop-blur-sm`}>
                                                {relatorioSelecionado.badgeTxt}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                            <Info size={14} className="text-indigo-500" />
                                            Parâmetros de Extração Analítica v3.0
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-12 bg-white/80 backdrop-blur-md rounded-[2rem] p-8 border border-white shadow-xl max-w-3xl border-l-[6px] border-l-slate-900">
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed italic">
                                        "{relatorioSelecionado.descricao}"
                                    </p>
                                </div>
                            </div>

                            {/* Área de Seleção de Parâmetros (Formulário High-End) */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 py-8 space-y-12">
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    
                                    {/* BLOCO 1: CRONOLOGIA */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Cronologia de Varredura</label>
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
                                                                ? 'bg-slate-900 text-white shadow-xl scale-[1.03]' 
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
                                                                ? 'bg-slate-900 text-white shadow-xl scale-[1.03]' 
                                                                : 'text-slate-400 hover:text-slate-700 hover:bg-white'}
                                                        `}
                                                    >
                                                        {sem}º Semestre
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* BLOCO 2: PERÍMETRO (TURMA) */}
                                    <div className="space-y-6" ref={refDropdownTurma}>
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Perímetro da Unidade</label>
                                        </div>

                                        <div className="relative group/input">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-slate-900 transition-colors">
                                                <Search size={20} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="BUSCAR TURMA OU DEIXAR GERAL..."
                                                onFocus={() => definirMostrarDropdownTurma(true)}
                                                onBlur={() => setTimeout(() => definirMostrarDropdownTurma(false), 200)}
                                                onChange={(e) => definirFiltros({ ...filtros, turma: e.target.value || 'Todas' })}
                                                value={filtros.turma === 'Todas' ? '' : filtros.turma}
                                                className="w-full h-20 pl-16 pr-16 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-sm font-black text-slate-900 uppercase tracking-widest outline-none transition-all focus:bg-white focus:border-slate-900 focus:shadow-2xl focus:scale-[1.01] placeholder:text-slate-300"
                                            />
                                            
                                            {mostrarDropdownTurma && (() => {
                                                const termo = filtros.turma === 'Todas' ? '' : filtros.turma.toLowerCase();
                                                const sugestoes = (infoBase?.turmas ?? [])
                                                    .filter((t: string) => t.toLowerCase().includes(termo))
                                                    .slice(0, 6);
                                                
                                                return (
                                                    <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white border border-slate-200 rounded-[2.2rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] z-[60] overflow-hidden p-3">
                                                        <button
                                                            onMouseDown={() => {
                                                                definirFiltros({ ...filtros, turma: 'Todas' });
                                                                definirMostrarDropdownTurma(false);
                                                            }}
                                                            className={`
                                                                w-full px-6 py-5 text-[11px] font-black rounded-2xl flex items-center justify-between transition-all uppercase tracking-widest mb-1
                                                                ${filtros.turma === 'Todas' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}
                                                            `}
                                                        >
                                                            <span>Radar Geral (Toda Instituição)</span>
                                                            <CheckCircle2 size={18} className={filtros.turma === 'Todas' ? 'text-emerald-400' : 'opacity-0'} />
                                                        </button>
                                                        <div className="h-px bg-slate-100 my-2 mx-4" />
                                                        {sugestoes.map((t: string) => (
                                                            <button
                                                                key={t}
                                                                onMouseDown={() => {
                                                                    definirFiltros({ ...filtros, turma: t });
                                                                    definirMostrarDropdownTurma(false);
                                                                }}
                                                                className={`
                                                                    w-full px-6 py-5 text-[11px] font-black rounded-2xl flex items-center justify-between transition-all uppercase tracking-widest mb-1
                                                                    ${filtros.turma === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}
                                                                `}
                                                            >
                                                                <span>{t}</span>
                                                                <CheckCircle2 size={18} className={filtros.turma === t ? 'text-emerald-400' : 'opacity-0'} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </section>

                                {/* DOSSIÊ DE VALIDAÇÃO (STATUS PANEL) */}
                                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full -ml-24 -mb-24 blur-3xl" />

                                    <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                                        <div className="w-20 h-20 bg-white/10 rounded-[1.8rem] border border-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                                            <BarChart2 size={36} strokeWidth={2} />
                                        </div>
                                        
                                        <div className="flex-1 space-y-3 text-center md:text-left">
                                            <h4 className="text-[12px] font-black text-indigo-300 uppercase tracking-[0.5em] leading-none mb-4">Inspeção Pré-Processamento</h4>
                                            <div className="flex flex-wrap gap-x-8 gap-y-4 justify-center md:justify-start">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Base de Dados</p>
                                                    <p className="text-xl font-black">{quantidadeAlunosPrevista} Alunos</p>
                                                </div>
                                                <div className="w-px h-10 bg-white/10 hidden md:block" />
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Localização</p>
                                                    <p className="text-xl font-black truncate max-w-[200px]">{filtros.turma === 'Todas' ? 'INSTITUIÇÃO' : filtros.turma}</p>
                                                </div>
                                                <div className="w-px h-10 bg-white/10 hidden md:block" />
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Ciclo Atual</p>
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
                                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-slate-400">
                                            <Download size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] leading-none mb-1">Criptografia em Trânsito</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Arquivo PDF • Renderização em 300 DPI</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={relatorioSelecionado.acao}
                                    disabled={carregandoBase}
                                    className="
                                        group relative h-20 px-12 rounded-[1.8rem] bg-slate-900 text-white transition-all duration-500
                                        hover:bg-black hover:shadow-[0_25px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 overflow-hidden
                                    "
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <div className="flex items-center gap-6 relative z-10">
                                        <span className="text-[12px] font-black uppercase tracking-[0.4em]">Compilar Documento</span>
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-transform group-hover:translate-x-2">
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center relative">
                            {/* Grid de fundo decorativo */}
                            <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-px opacity-[0.03] pointer-events-none">
                                {Array.from({ length: 144 }).map((_, i) => <div key={i} className="bg-slate-900"></div>)}
                            </div>
                            
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



