import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo, Esqueleto, CardMetrica } from '@/compartilhado/componentes/UI';
import { api } from '@/compartilhado/servicos/api';
import {
    Users,
    Search,
    BookOpen,
    Clock,
    Plus,
    Edit2,
    Trash2,
    Calendar,
    ArrowRight,
    MapPin,
    Grid,
    Sun,
    CloudSun,
    Moon,
    Zap,
    GraduationCap,
    Activity,
    Layers,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';

const log = criarRegistrador('Turmas');
import { usarPermissoes } from '../../../compartilhado/autorizacao/ContextoPermissoes';
import { Registrador } from '@/compartilhado/servicos/auditoria';
import { usarEscola } from '@/escola/ProvedorEscola';

import FormTurmaModal from './FormTurmaModal';
import { turmaServico } from '../servicos/turma.servico';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';

export default function Turmas() {
    const navegar = useNavigate();
    const { podeAcessar } = usarPermissoes();
    const escola = usarEscola();
    const { dados, carregando, carregandoInicial, recarregar: carregarTurmas } = usarConsulta(
        ['turmas-online'],
        () => turmaServico.carregarOnline()
    );

    const turmas = dados || [];
    const [searchParams, setSearchParams] = useSearchParams();
    const termoInicial = searchParams.get('busca') || '';
    const turnoInicial = searchParams.get('turno') || 'TODOS';

    const [modalAberto, definirModalAberto] = useState(searchParams.get('acao') === 'novo');
    const [turmaEmEdicao, definirTurmaEmEdicao] = useState(null);
    const [termoBusca, definirTermoBusca] = useState(termoInicial);
    const [filtroTurno, definirFiltroTurno] = useState(turnoInicial);
    const [filtroAnoLetivo, definirFiltroAnoLetivo] = useState(new Date().getFullYear().toString());
    const [turmaParaExcluir, definirTurmaParaExcluir] = useState<string | null>(null);

    // Sincronizar com URL
    useEffect(() => {
        const busca = searchParams.get('busca');
        if (busca !== null) definirTermoBusca(busca);

        const turno = searchParams.get('turno');
        if (turno) definirFiltroTurno(turno);

        if (searchParams.get('acao') === 'novo') {
            definirTurmaEmEdicao(null);
            definirModalAberto(true);
        }
    }, [searchParams]);

    // Mapeamento de Cores e Ãcones por Turno
    const CONFIG_TURNO = {
        'Matutino': {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
            indicator: 'bg-amber-400',
            icone: Sun
        },
        'Vespertino': {
            bg: 'bg-sky-50',
            text: 'text-sky-700',
            border: 'border-sky-200',
            indicator: 'bg-sky-400',
            icone: CloudSun
        },
        'Noturno': {
            bg: 'bg-slate-50',
            text: 'text-slate-700',
            border: 'border-slate-200',
            indicator: 'bg-slate-600',
            icone: Moon
        },
        'Integral': {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            indicator: 'bg-emerald-500',
            icone: Zap
        }
    };

    const salvarTurma = async (dadosTurma: any) => {
        const { serie, letra, turno, ano_letivo, lotacao_maxima } = dadosTurma;

        if (!serie || !letra || !turno) {
            toast.error('Preencha os campos obrigatórios.');
            return;
        }

        const idTurma = `${serie}º ${letra} - ${turno} - ${ano_letivo}`;

        const novaTurma = {
            id: idTurma,
            serie,
            letra,
            turno,
            ano_letivo,
            lotacao_maxima,
            professor_regente: dadosTurma.professor_regente,
            sala: dadosTurma.sala,
            criado_em: turmaEmEdicao ? (turmaEmEdicao as any).criado_em : new Date().toISOString()
        };

        try {
            // Se o ID mudou (renomeação de turma vazia), removemos a antiga primeiro
            if (turmaEmEdicao && (turmaEmEdicao as any).id !== idTurma) {
                await turmaServico.excluirTurma((turmaEmEdicao as any).id);
            }

            // Salva a nova versão (ou insere a renomeada)
            await turmaServico.salvarTurma(novaTurma, !!turmaEmEdicao, turmaEmEdicao || undefined);

            toast.success(turmaEmEdicao ? 'Configurações de turma atualizadas' : 'Turma criada com sucesso');
            definirModalAberto(false);
            carregarTurmas();
        } catch (erro: any) {
            log.error('Erro ao salvar', erro);
            toast.error(erro.message || 'Não foi possível salvar os dados da turma.');
        }
    };

    const excluirTurma = (id: string) => {
        definirTurmaParaExcluir(id);
    };

    const confirmarExclusao = async () => {
        if (!turmaParaExcluir) return;
        try {
            await turmaServico.excluirTurma(turmaParaExcluir);
            toast.success('Turma excluída com sucesso');
            carregarTurmas();
        } catch (erro) {
            log.error('Erro ao excluir', erro);
            toast.error('Não foi possível excluir a turma.');
        } finally {
            definirTurmaParaExcluir(null);
        }
    };

    const abrirEdicao = (turma: any) => {
        definirTurmaEmEdicao(turma);
        definirModalAberto(true);
    };

    const abrirNovo = () => {
        definirTurmaEmEdicao(null);
        definirModalAberto(true);
    };

    const turmasFiltradas = turmas.filter(t => {
        const matchBusca = t.id.toLowerCase().includes(termoBusca.toLowerCase()) ||
            (t.professor_regente || '').toLowerCase().includes(termoBusca.toLowerCase());
        const matchTurno = filtroTurno === 'TODOS' || t.turno === filtroTurno;
        const matchAno = t.ano_letivo.toString() === filtroAnoLetivo;
        return matchBusca && matchTurno && matchAno;
    });

    if (!podeAcessar('turmas', 'visualizar')) {
        return (
            <LayoutAdministrativo titulo="Lista de Turmas" subtitulo="" acoes={null}>
                <div className="flex flex-col items-center justify-center h-96 gap-4 text-slate-400 opacity-50 grayscale">
                    <BookOpen size={64} strokeWidth={1} />
                    <p className="font-black uppercase tracking-widest text-[11px]">Você não tem permissão para ver esta página</p>
                </div>
            </LayoutAdministrativo>
        );
    }

    const AcoesHeader = (
        <Botao
            variante="primario"
            tamanho="sm"
            icone={Plus}
            onClick={abrirNovo}
        >
            Criar Nova Turma
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Engrenagem Acadêmica"
            subtitulo="Controle total sobre turmas, alocações e capacidade operacional da escola"
            acoes={AcoesHeader}
        >
            {/* Métricas Vibrantes (Luxury 2xl) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <CardMetrica
                    label="Unidades de Ensino"
                    valor={turmas.length}
                    icone={Grid}
                    bg="bg-indigo-50/50"
                    text="text-indigo-600"
                    border="border-indigo-100"
                />
                <CardMetrica
                    label="Células de Conhecimento"
                    valor={turmas.reduce((acc, t) => acc + (t.totalAlunos || 0), 0)}
                    icone={Users}
                    bg="bg-emerald-50/50"
                    text="text-emerald-600"
                    border="border-emerald-100"
                />
                <CardMetrica
                    label="Volume de Vagas"
                    valor={turmas.reduce((acc, t) => acc + (t.lotacao_maxima || 40), 0)}
                    icone={GraduationCap}
                    bg="bg-amber-50/50"
                    text="text-amber-600"
                    border="border-amber-100"
                />
                <CardMetrica
                    label="Eficiência de Ocupação"
                    valor={`${Math.round((turmas.reduce((acc, t) => acc + (t.totalAlunos || 0), 0) / (turmas.reduce((acc, t) => acc + (t.lotacao_maxima || 40), 0) || 1)) * 100)}%`}
                    icone={Activity}
                    bg="bg-rose-50/50"
                    text="text-rose-600"
                    border="border-rose-100"
                />
            </div>

            {/* Toolbar de Filtros SaaS Elite */}
            <div className="bg-white/40 backdrop-blur-md border border-slate-200/60 shadow-xl p-4 rounded-[2rem]">
                <BarraFiltro className="bg-transparent border-none shadow-none p-0 flex-wrap lg:flex-nowrap">
                    <div className="flex flex-col gap-2 flex-1 w-full">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 leading-none">Radar de Busca</label>
                        <InputBusca
                            icone={Search}
                            placeholder="Série, professor ou localização..."
                            value={termoBusca}
                            onChange={(e) => definirTermoBusca(e.target.value)}
                            className="w-full h-12 bg-white border-slate-200 rounded-2xl"
                        />
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 leading-none">Ciclo</label>
                        <div className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 h-12 min-w-[200px]">
                            {[new Date().getFullYear().toString(), (new Date().getFullYear() + 1).toString()].map((ano) => (
                                <button
                                    key={ano}
                                    onClick={() => definirFiltroAnoLetivo(ano)}
                                    className={`flex-1 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${filtroAnoLetivo === ano
                                        ? 'bg-white text-slate-900 border-slate-200 shadow-lg'
                                        : 'text-slate-400 border-transparent hover:text-slate-600'
                                        }`}
                                >
                                    <Calendar size={12} /> {ano}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 leading-none">Regime de Turno</label>
                        <div className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 h-12">
                            {['TODOS', 'Matutino', 'Vespertino', 'Noturno', 'Integral'].map((filtro) => {
                                const IconeTurno = filtro === 'TODOS' ? Grid : (CONFIG_TURNO[filtro as keyof typeof CONFIG_TURNO]?.icone || Clock);
                                return (
                                    <button
                                        key={filtro}
                                        onClick={() => definirFiltroTurno(filtro)}
                                        className={`px-5 h-full rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border ${filtroTurno === filtro
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105'
                                            : 'text-slate-400 border-transparent hover:text-slate-600'
                                            }`}
                                    >
                                        <IconeTurno size={12} />
                                        {filtro === 'TODOS' ? 'Todos' : filtro}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </BarraFiltro>
            </div>

            {/* Tabela SaaS High-End */}
            <CartaoConteudo className="mt-10 bg-white border-slate-200 shadow-2xl rounded-[1.5rem] overflow-hidden">
                {carregandoInicial ? (
                    <div className="py-20 flex flex-col items-center gap-4 text-slate-300">
                         <Loader2 size={40} className="animate-spin text-eletrico" />
                         <span className="text-[11px] font-black uppercase tracking-[0.5em]">Sincronizando Grades...</span>
                    </div>
                ) : turmasFiltradas.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center animate-fade-in px-8">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-slate-100 shadow-inner">
                            <Layers size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-2 leading-none">Nenhuma Turma Estruturada</h3>
                        <p className="text-[10px] font-bold text-slate-400 max-w-xs mx-auto uppercase tracking-widest leading-relaxed text-center">Crie sua primeira unidade de ensino para começar o gerenciamento.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-900 border-b border-slate-800">
                                    <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identificação</th>
                                    <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Regência Acadêmica</th>
                                    <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Alocação</th>
                                    <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Turno Escolar</th>
                                    <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Otimização de Vagas</th>
                                    <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Controle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {turmasFiltradas.map((turma) => {
                                    const lotacao = turma.lotacao_maxima || 40;
                                    const totalAlunos = turma.totalAlunos || 0;
                                    const ocupacao = (totalAlunos / lotacao) * 100;
                                    const turnoCfg = CONFIG_TURNO[turma.turno as keyof typeof CONFIG_TURNO] || {
                                        bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', indicator: 'bg-slate-500', icone: Clock
                                    };

                                    return (
                                        <tr
                                            key={turma.id}
                                            className="hover:bg-slate-50/80 transition-all duration-300 group cursor-pointer"
                                            onClick={() => navegar(`/${escola.id}/admin/alunos?turma=${turma.id}`)}
                                        >
                                            <td className="py-6 px-10">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-base font-black text-slate-900 group-hover:text-eletrico transition-colors uppercase tracking-tighter">{turma.serie}º {turma.letra}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50 w-fit px-2 py-0.5 rounded">Ciclo {turma.ano_letivo}</span>
                                                </div>
                                            </td>
                                            <td className="py-6 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center border border-slate-700 shadow-lg group-hover:bg-indigo-600 transition-all">
                                                        <GraduationCap size={16} />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-800 tracking-tight group-hover:text-slate-950 transition-colors uppercase">{turma.professor_regente || 'NÃO DESIGNADO'}</span>
                                                </div>
                                            </td>
                                            <td className="py-6 px-8 text-center uppercase">
                                                <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100/80 text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-slate-200 group-hover:bg-white shadow-sm transition-all">
                                                    <MapPin size={12} className="text-eletrico" /> {turma.sala || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="py-6 px-8">
                                                <span className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${turnoCfg.bg} ${turnoCfg.text} ${turnoCfg.border} active:scale-95 transition-transform`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${turnoCfg.indicator} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></div>
                                                    <turnoCfg.icone size={12} />
                                                    {turma.turno}
                                                </span>
                                            </td>
                                            <td className="py-6 px-8">
                                                <div className="flex flex-col gap-2 min-w-[150px]">
                                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                                                        <span className={ocupacao >= 100 ? 'text-rose-600' : 'text-slate-400'}>
                                                            {totalAlunos} / {lotacao} ALUNOS
                                                        </span>
                                                        <span className={ocupacao >= 90 ? 'text-rose-600' : 'text-slate-400'}>
                                                            {ocupacao.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-[1500ms] ease-out-expo ${ocupacao >= 100 ? 'bg-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.3)]' :
                                                                ocupacao >= 85 ? 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]' :
                                                                    'bg-eletrico shadow-[0_0_12px_rgba(30,58,138,0.3)]'
                                                                }`}
                                                            style={{ width: `${Math.min(ocupacao, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 px-10 text-right">
                                                <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                    <Botao variante="ghost" tamanho="sm" icone={Edit2} onClick={() => abrirEdicao(turma)} className="hover:bg-slate-100 rounded-xl p-3" />
                                                    <Botao variante="ghost" tamanho="sm" icone={Trash2} onClick={() => excluirTurma(turma.id)} className="hover:bg-rose-50 hover:text-rose-600 rounded-xl p-3" />
                                                    <button 
                                                        className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl shadow-xl hover:bg-eletrico hover:-translate-x-1 transition-all active:scale-90"
                                                        onClick={() => navegar(`/${escola.id}/admin/alunos?turma=${turma.id}`)}
                                                    >
                                                        <ArrowRight size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CartaoConteudo>

            {modalAberto && (
                <FormTurmaModal
                    turma={turmaEmEdicao}
                    aoFechar={() => definirModalAberto(false)}
                    aoSalvar={salvarTurma}
                />
            )}

            {turmaParaExcluir && (
                <ModalConfirmacao
                    titulo="Excluir Turma"
                    mensagem={`Tem certeza que deseja excluir a turma ${turmaParaExcluir}? Esta ação removerá a turma do sistema.`}
                    textoConfirmar="Sim, Excluir"
                    aoConfirmar={confirmarExclusao}
                    aoCancelar={() => definirTurmaParaExcluir(null)}
                    variante="perigo"
                />
            )}
        </LayoutAdministrativo>
    );
}

