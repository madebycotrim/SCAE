import { useState, useRef } from 'react';
import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { usarPermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';
import { Botao, BarraFiltro, CartaoConteudo, InputBusca } from '@compartilhado/componentes/UI';

import {
    FileText,
    Download,
    BarChart2,
    FileSpreadsheet,
    FileCheck,
    Clock,
    ChevronDown,
    Calendar,
    Layers,
    ShieldCheck,
    ArrowRight,
    Search,
    CheckCircle2
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
        const toastId = toast.loading(`Compilando matriz de dados: ${tipo}...`);
        try {
            if (tipo === 'Risco de Evasão' || tipo === 'Fechamento Mensal') {
                await relatorioServico.gerarRelatorioEspecial(tipo, filtros);
            } else {
                const dados = await relatorioServico.obterDadosFiltrados(filtros);
                if (dados.length === 0) throw new Error('Nenhuma ocorrência localizada no período');
                relatorioServico.gerarPDF(dados, `Relatório de ${tipo}`, filtros);
            }

            await Registrador.registrar('EXPORTAR_RELATORIO', 'relatorio', tipo, { filtros, formato: 'PDF' });
            toast.success('Relatório processado e disponível', { id: toastId });
        } catch (e: any) {
            log.error('Erro ao exportar relatório', e);
            toast.error(e.message || 'Falha na geração do documento.', { id: toastId });
        }
    };

    const CARDS_RELATORIO = [
        {
            titulo: 'Folha de Frequência',
            descricao: 'Registro cronológico detalhado de entradas e saídas.',
            icone: Clock,
            badgeTxt: 'PDF Oferecido',
            badgeCor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            iconeCor: 'bg-indigo-50 text-indigo-600',
            acao: () => gerarRelatorio('Frequência Diária'),
        },
        {
            titulo: 'Fechamento de Ciclo',
            descricao: 'Consolidado institucional para secretaria e direção técnica.',
            icone: FileSpreadsheet,
            badgeTxt: 'Auditado',
            badgeCor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            iconeCor: 'bg-emerald-50 text-emerald-600',
            acao: () => gerarRelatorio('Fechamento Mensal'),
        },
        {
            titulo: 'Análise de Abandono',
            descricao: 'Identificação de vulnerabilidade por ausência prolongada.',
            icone: BarChart2,
            badgeTxt: 'Prioritário',
            badgeCor: 'bg-amber-50 text-amber-700 border-amber-200',
            iconeCor: 'bg-amber-50 text-amber-600',
            acao: () => gerarRelatorio('Risco de Evasão'),
        },
        ...(podeVerLogs ? [{
            titulo: 'Audit Trail Local',
            descricao: 'Histórico de transações e logs de segurança da unidade.',
            icone: FileCheck,
            badgeTxt: 'Segurança',
            badgeCor: 'bg-slate-100 text-slate-700 border-slate-200',
            iconeCor: 'bg-slate-100 text-slate-600',
            acao: () => gerarRelatorio('Log de Auditoria'),
        }] : []),
    ];

    const [termoBusca, definirTermoBusca] = useState('');

    const relatoriosFiltrados = CARDS_RELATORIO.filter(r =>
        r.titulo.toLowerCase().includes(termoBusca.toLowerCase()) ||
        r.descricao.toLowerCase().includes(termoBusca.toLowerCase())
    );

    return (
        <LayoutAdministrativo
            titulo="Dados e Relatórios"
            subtitulo="Gestão de informações e exportações institucionais"
            acoes={null}
        >
            <div className="space-y-8 pb-12">
                <BarraFiltro className="bg-slate-50 border-slate-200/60 shadow-sm p-4 rounded-[2rem]">
                    <div className="flex flex-col gap-2.5 flex-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Pesquisa de Relatórios</label>
                        <InputBusca
                            icone={Search}
                            placeholder="Buscar por módulo ou tipo de exportação..."
                            value={termoBusca}
                            onChange={(e) => definirTermoBusca(e.target.value)}
                            className="w-full h-12 rounded-2xl"
                        />
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap gap-6 items-end">
                        {/* Ano Letivo */}
                        <div className="flex flex-col gap-2.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Ciclo Acadêmico</label>
                            <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 h-12 shadow-sm">
                                {[anoAtual - 1, anoAtual, anoAtual + 1].map((ano) => (
                                    <button
                                        key={ano}
                                        onClick={() => {
                                            const periodo = calcularPeriodo(ano, filtros.semestre);
                                            definirFiltros({ ...filtros, anoLetivo: ano, ...periodo });
                                        }}
                                        className={`px-5 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtros.anoLetivo === ano ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Calendar size={12} /> {ano}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Semestre */}
                        <div className="flex flex-col gap-2.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Etapa Semestral</label>
                            <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 h-12 shadow-sm">
                                {([1, 2] as const).map((sem) => (
                                    <button
                                        key={sem}
                                        onClick={() => {
                                            const periodo = calcularPeriodo(filtros.anoLetivo, sem);
                                            definirFiltros({ ...filtros, semestre: sem, ...periodo });
                                        }}
                                        className={`px-5 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtros.semestre === sem ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        {sem}º SEMESTRE
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Turma */}
                        <div className="flex flex-col gap-2.5 relative" ref={refDropdownTurma}>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Filtro por Unidade / Turma</label>
                            <div className="relative group min-w-[280px]">
                                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={16} />
                                <input
                                    type="text"
                                    placeholder="Consolidado (Todas as turmas)"
                                    value={filtros.turma === 'Todas' ? '' : filtros.turma}
                                    onFocus={() => definirMostrarDropdownTurma(true)}
                                    onBlur={() => setTimeout(() => definirMostrarDropdownTurma(false), 200)}
                                    onChange={(e) => definirFiltros({ ...filtros, turma: e.target.value || 'Todas' })}
                                    className="w-full pl-11 pr-12 h-12 bg-white border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all text-slate-800 placeholder:text-slate-400 shadow-sm"
                                />
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:rotate-180 transition-transform" size={18} />

                                {mostrarDropdownTurma && (() => {
                                    const termo = filtros.turma === 'Todas' ? '' : filtros.turma.toLowerCase();
                                    const sugestoes = (turmasDisponiveis ?? [])
                                        .filter((t: string) => t.toLowerCase().includes(termo))
                                        .slice(0, 5);
                                    return (
                                        <ul className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-zoom-in p-2 ring-1 ring-black/5">
                                            <li
                                                onMouseDown={() => {
                                                    definirFiltros({ ...filtros, turma: 'Todas' });
                                                    definirMostrarDropdownTurma(false);
                                                }}
                                                className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors rounded-xl border-b border-slate-50 last:border-0 flex items-center justify-between group"
                                            >
                                                Consolidado (Todas as turmas)
                                                {filtros.turma === 'Todas' && <CheckCircle2 size={12} className="text-indigo-600" />}
                                            </li>
                                            {sugestoes.map((t: string) => (
                                                <li
                                                    key={t}
                                                    onMouseDown={() => {
                                                        definirFiltros({ ...filtros, turma: t });
                                                        definirMostrarDropdownTurma(false);
                                                    }}
                                                    className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors rounded-xl border-b border-slate-50 last:border-0 flex items-center justify-between group"
                                                >
                                                    {t}
                                                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </li>
                                            ))}
                                        </ul>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </BarraFiltro>

                {/* Grid de Relatórios SaaS Style */}
                <CartaoConteudo className="bg-white border-slate-200/60 shadow-2xl rounded-[2.5rem] overflow-hidden mt-8">
                    <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Fluxos de Exportação Oficiais</h2>
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 shadow-sm">
                            {CARDS_RELATORIO.length} Módulos Disponíveis
                        </span>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Módulo / Relatório</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Finalidade Institucional</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Protocolo</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ação de Exportação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {relatoriosFiltrados.map((item, idx) => {
                                    const Icone = item.icone;
                                    return (
                                        <tr key={idx} className="hover:bg-indigo-50/20 transition-all group">
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${item.iconeCor} border-slate-200 shadow-sm group-hover:scale-110 transition-transform group-hover:bg-white`}>
                                                        <Icone size={20} strokeWidth={2} />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{item.titulo}</p>
                                                </div>
                                            </td>
                                            <td className="py-5 px-8">
                                                <p className="text-xs font-bold text-slate-400 group-hover:text-slate-500 transition-colors leading-relaxed truncate max-w-xs">{item.descricao}</p>
                                            </td>
                                            <td className="py-5 px-8 text-center">
                                                <span className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-xl border ${item.badgeCor} shadow-sm inline-block`}>
                                                    {item.badgeTxt}
                                                </span>
                                            </td>
                                            <td className="py-5 px-8 text-right">
                                                <button
                                                    onClick={item.acao}
                                                    disabled={carregando}
                                                    className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 group-hover:text-white transition-all bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-200 group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:shadow-lg tracking-widest active:scale-95 disabled:opacity-50"
                                                >
                                                    <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                                                    EXPORTAR PDF
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CartaoConteudo>

                {/* Compliance LGPD */}
                <div className="flex items-start gap-5 p-8 rounded-[2.5rem] border border-indigo-100 bg-indigo-50/30 text-slate-600 shadow-inner group">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-indigo-100 text-indigo-500 shrink-0 shadow-lg group-hover:rotate-6 transition-transform">
                        <ShieldCheck size={24} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Compliance & Audit Trail (LGPD Art. 37)</p>
                        <p className="text-sm font-bold leading-relaxed text-slate-600">
                            Toda exportação de dados é registrada imutavelmente com o selo institucional do operador. A manipulação de dados de segurança de menores deve seguir as diretrizes rigorosas da SEEDF e do ECA.
                        </p>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
