import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo, Esqueleto } from '@/compartilhado/componentes/UI';
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
    GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';

const log = criarRegistrador('Turmas');
import { usarPermissoes } from '@/compartilhado/autorizacao/ContextoPermissoes';
import { Registrador } from '@/compartilhado/servicos/auditoria';
import { usarEscola } from '@/escola/ProvedorEscola';

import FormTurmaModal from './FormTurmaModal';
import { turmaServico } from '../servicos/turma.servico';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';

export default function Turmas() {
    const navegar = useNavigate();
    const { podeAcessar } = usarPermissoes();
    const escola = usarEscola();
    const { dados, carregando, recarregar: carregarTurmas } = usarConsulta(
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
            await turmaServico.salvarTurma(novaTurma, !!turmaEmEdicao);

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
            titulo="Lista de Turmas"
            subtitulo="Gerencie as turmas, professores e a ocupação das salas"
            acoes={AcoesHeader}
            carregando={carregando}
        >
            <BarraFiltro className="bg-white border-slate-200 shadow-suave p-3 rounded-2xl">
                <div className="flex flex-col gap-2 flex-1 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 leading-none">Buscar Turma</label>
                    <InputBusca
                        icone={Search}
                        placeholder="Nome, professor ou turno..."
                        value={termoBusca}
                        onChange={(e) => definirTermoBusca(e.target.value)}
                        className="w-full h-11"
                    />
                </div>

                {/* Filtro de Ano */}
                <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 leading-none">Ano Letivo</label>
                    <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200 h-11 min-w-[180px]">
                        {[new Date().getFullYear().toString(), (new Date().getFullYear() + 1).toString()].map((ano) => (
                            <button
                                key={ano}
                                onClick={() => definirFiltroAnoLetivo(ano)}
                                className={`flex-1 h-full rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${filtroAnoLetivo === ano
                                    ? 'bg-white text-slate-900 border-slate-200 shadow-suave'
                                    : 'text-slate-400 border-transparent hover:text-slate-600'
                                    }`}
                            >
                                <Calendar size={12} /> {ano}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filtro de Turno */}
                <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 leading-none">Turno</label>
                    <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200 h-11">
                        {['TODOS', 'Matutino', 'Vespertino', 'Noturno', 'Integral'].map((filtro) => {
                            const IconeTurno = filtro === 'TODOS' ? Grid : (CONFIG_TURNO[filtro as keyof typeof CONFIG_TURNO]?.icone || Clock);
                            return (
                                <button
                                    key={filtro}
                                    onClick={() => definirFiltroTurno(filtro)}
                                    className={`px-4 h-full rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border ${filtroTurno === filtro
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-suave'
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

            {/* Listagem em Tabela SaaS */}
            <CartaoConteudo className="mt-8">
                {carregando ? (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma</th>
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Regente</th>
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sala</th>
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turno</th>
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ocupação</th>
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="animate-fade-in">
                                        <td className="py-5 px-8"><Esqueleto className="w-24 h-4" /></td>
                                        <td className="py-5 px-8"><Esqueleto className="w-32 h-4" /></td>
                                        <td className="py-5 px-8 text-center"><Esqueleto className="w-12 h-6 mx-auto" /></td>
                                        <td className="py-5 px-8"><Esqueleto className="w-20 h-6" /></td>
                                        <td className="py-5 px-8"><Esqueleto className="w-28 h-4 rounded-full" /></td>
                                        <td className="py-5 px-8 text-right"><Esqueleto className="w-24 h-8 ml-auto" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : turmasFiltradas.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center animate-fade-in">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 border border-slate-100 shadow-sm">
                            <BookOpen size={32} className="text-slate-200" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-2">Turmas não identificadas</h3>
                        <p className="text-[9px] font-bold text-slate-400 max-w-xs mx-auto uppercase tracking-widest text-center leading-relaxed">Nenhuma unidade escolar corresponde aos filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma</th>
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Regente</th>
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sala</th>
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turno</th>
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ocupação</th>
                                    <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
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
                                            className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                                            onClick={() => navegar(`/${escola.id}/admin/alunos?turma=${turma.id}`)}
                                        >
                                            <td className="py-4 px-8">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-black text-slate-800 group-hover:text-slate-950 transition-colors uppercase tracking-tight">{turma.serie}º {turma.letra}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Ano {turma.ano_letivo}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-900 border border-slate-200/50 transition-colors">
                                                        <GraduationCap size={14} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{turma.professor_regente || 'Não designado'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-8 text-center">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-slate-200/60">
                                                    <MapPin size={12} /> {turma.sala || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="py-4 px-8">
                                                <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-2xl text-[9px] font-black uppercase tracking-[0.1em] border ${turnoCfg.bg} ${turnoCfg.text} ${turnoCfg.border}`}>
                                                    <div className={`w-1 h-1 rounded-full ${turnoCfg.indicator}`}></div>
                                                    <turnoCfg.icone size={10} />
                                                    {turma.turno}
                                                </span>
                                            </td>
                                            <td className="py-4 px-8">
                                                <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-tight">
                                                        <span className={ocupacao >= 100 ? 'text-rose-600' : 'text-slate-400'}>
                                                            {totalAlunos} / {lotacao}
                                                        </span>
                                                        <span className={ocupacao >= 90 ? 'text-rose-600' : 'text-slate-400'}>
                                                            {ocupacao.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${ocupacao >= 100 ? 'bg-rose-500' :
                                                                ocupacao >= 85 ? 'bg-amber-400' :
                                                                    'bg-slate-900'
                                                                }`}
                                                            style={{ width: `${Math.min(ocupacao, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-8 text-right">
                                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Botao variante="ghost" tamanho="sm" icone={Edit2} onClick={() => abrirEdicao(turma)} title="Configurar Turma" className="hover:text-indigo-600" />
                                                    <Botao variante="ghost" tamanho="sm" icone={Trash2} onClick={() => excluirTurma(turma.id)} title="Remover Registro" className="hover:text-rose-600" />
                                                    <Botao variante="ghost" tamanho="sm" icone={ArrowRight} onClick={() => navegar(`/${escola.id}/admin/alunos?turma=${turma.id}`)} title="Ver Alunos" className="hover:text-indigo-600" />
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
                    variante="perigoso"
                />
            )}
        </LayoutAdministrativo>
    );
}

