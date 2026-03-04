import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@compartilhado/componentes/UI';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { api } from '@compartilhado/servicos/api';
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
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Turmas');
import { usarPermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { usarEscola } from '@escola/ProvedorEscola';

import FormTurmaModal from './FormTurmaModal';

export default function Turmas() {
    const navegar = useNavigate();
    const { podeAcessar } = usarPermissoes();
    const escola = usarEscola();
    const { dados, carregando, recarregar: carregarTurmas } = usarConsulta(
        ['turmas-com-contagem'],
        async () => {
            const banco = await bancoLocal.iniciarBanco();
            const todasTurmas = await banco.getAll('turmas');

            const turmasComContagem = await Promise.all(todasTurmas.map(async (t) => {
                const count = await bancoLocal.contarAlunosPorTurma(t.id);
                return { ...t, totalAlunos: count };
            }));

            turmasComContagem.sort((a, b) => {
                if (a.id < b.id) return -1;
                if (a.id > b.id) return 1;
                return 0;
            });

            return turmasComContagem;
        }
    );

    const turmas = dados || [];
    const [modalAberto, definirModalAberto] = useState(false);
    const [turmaEmEdicao, definirTurmaEmEdicao] = useState(null);
    const [termoBusca, definirTermoBusca] = useState('');
    const [filtroTurno, definirFiltroTurno] = useState('TODOS');
    const [filtroAnoLetivo, definirFiltroAnoLetivo] = useState(new Date().getFullYear().toString());

    // Mapeamento de Cores e Ícones por Turno
    const CONFIG_TURNO = {
        'Matutino': {
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            border: 'border-orange-200',
            indicator: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]',
            icone: Sun
        },
        'Vespertino': {
            bg: 'bg-sky-50',
            text: 'text-sky-700',
            border: 'border-sky-200',
            indicator: 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]',
            icone: CloudSun
        },
        'Noturno': {
            bg: 'bg-indigo-50',
            text: 'text-indigo-700',
            border: 'border-indigo-200',
            indicator: 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]',
            icone: Moon
        },
        'Integral': {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            indicator: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
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
            criado_em: turmaEmEdicao ? turmaEmEdicao.criado_em : new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };

        try {
            const banco = await bancoLocal.iniciarBanco();

            if (!turmaEmEdicao) {
                const existente = await banco.get('turmas', idTurma);
                if (existente) {
                    toast.error('Identificador de turma já existente no cluster local.');
                    return;
                }
            }

            if (turmaEmEdicao && turmaEmEdicao.id !== idTurma) {
                await banco.delete('turmas', turmaEmEdicao.id);
            }

            await banco.put('turmas', novaTurma);

            if (navigator.onLine) {
                try {
                    await api.enviar(`/turmas/${idTurma}`, novaTurma);
                } catch (e) {
                    log.warn('Erro sync nuvem', e);
                }
            }

            const acaoLog = turmaEmEdicao ? 'TURMA_EDITAR' : 'TURMA_CRIAR';
            await Registrador.registrar(acaoLog, 'turma', idTurma, {
                ano_letivo: novaTurma.ano_letivo,
                turno: novaTurma.turno,
                lotacao_maxima: novaTurma.lotacao_maxima,
                professor_regente: novaTurma.professor_regente,
                sala: novaTurma.sala
            });

            toast.success(turmaEmEdicao ? 'Configurações de turma atualizadas' : 'Turma operacional inicializada');
            definirModalAberto(false);
            carregarTurmas();
        } catch (erro) {
            log.error('Erro ao salvar', erro);
            toast.error('Falha crítica ao persistir dados da turma.');
        }
    };

    const excluirTurma = async (id: string) => {
        if (!window.confirm(`Confirma a desativação permanente da turma ${id}?`)) return;

        try {
            const banco = await bancoLocal.iniciarBanco();
            await banco.delete('turmas', id);

            if (navigator.onLine) {
                try {
                    await api.remover(`/turmas/${id}`);
                } catch (e) {
                    log.warn('Erro sync nuvem', e);
                }
            }

            await Registrador.registrar('TURMA_EXCLUIR', 'turma', id, {});

            toast.success('Turma removida do ecossistema');
            carregarTurmas();
        } catch (erro) {
            log.error('Erro ao excluir', erro);
            toast.error('Falha ao remover registro.');
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
            <LayoutAdministrativo titulo="Gestão de Turmas" subtitulo="" acoes={null}>
                <div className="flex flex-col items-center justify-center h-96 gap-4 text-slate-400 opacity-50 grayscale">
                    <BookOpen size={64} strokeWidth={1} />
                    <p className="font-black uppercase tracking-widest text-[11px]">Nível de acesso insuficiente</p>
                </div>
            </LayoutAdministrativo>
        );
    }

    const AcoesHeader = (
        <Botao
            variante="primario"
            tamanho="lg"
            icone={Plus}
            onClick={abrirNovo}
        >
            Criar Nova Turma
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Gestão de Turmas"
            subtitulo="Controle de classes, enturmação e ocupação de vagas"
            acoes={AcoesHeader}
        >
            <BarraFiltro className="bg-slate-50 border-slate-200/60 shadow-sm p-4 rounded-[2rem]">
                <div className="flex flex-col gap-2.5 flex-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Pesquisa de Classes</label>
                    <InputBusca
                        icone={Search}
                        placeholder="Nome, regente ou identificador de turno..."
                        value={termoBusca}
                        onChange={(e) => definirTermoBusca(e.target.value)}
                        className="w-full h-12 rounded-2xl"
                    />
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-6 items-end">
                    {/* Filtro de Ano */}
                    <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Ciclo Acadêmico</label>
                        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 h-12 shadow-sm">
                            {[new Date().getFullYear().toString(), (new Date().getFullYear() + 1).toString()].map((ano) => (
                                <button
                                    key={ano}
                                    onClick={() => definirFiltroAnoLetivo(ano)}
                                    className={`px-5 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filtroAnoLetivo === ano
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                        }`}
                                >
                                    <Calendar size={12} /> {ano}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filtro de Turno */}
                    <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Regime de Turno</label>
                        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 h-12 shadow-sm">
                            {['TODOS', 'Matutino', 'Vespertino', 'Noturno', 'Integral'].map((filtro) => {
                                const IconeTurno = filtro === 'TODOS' ? Grid : (CONFIG_TURNO[filtro as keyof typeof CONFIG_TURNO]?.icone || Clock);
                                return (
                                    <button
                                        key={filtro}
                                        onClick={() => definirFiltroTurno(filtro)}
                                        className={`px-4 h-full rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${filtroTurno === filtro
                                            ? 'bg-slate-900 text-white shadow-md'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                            }`}
                                    >
                                        <IconeTurno size={12} />
                                        {filtro === 'TODOS' ? 'Todos' : filtro}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </BarraFiltro>

            {/* Listagem em Tabela SaaS */}
            <CartaoConteudo className="bg-white border-slate-200/60 shadow-2xl rounded-[2.5rem] overflow-hidden mt-8">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificação / Classe</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Responsável (Regente)</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Localização</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Regime / Turno</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ocupação vs Vagas</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações de Gestão</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {carregando ? (
                                [...Array(6)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="py-6 px-8 h-16 bg-slate-50/50"></td>
                                    </tr>
                                ))
                            ) : turmasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-50 grayscale">
                                            <BookOpen size={48} className="text-slate-400" />
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Nenhum cluster de turma localizado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                turmasFiltradas.map((turma) => {
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
                                            <td className="py-5 px-8">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{turma.serie}º {turma.letra}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ano {turma.ano_letivo}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                        <GraduationCap size={16} />
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{turma.professor_regente || 'Não designado'}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-8 text-center">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200">
                                                    <MapPin size={12} /> {turma.sala || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="py-5 px-8">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border-2 shadow-sm ${turnoCfg.bg} ${turnoCfg.text} ${turnoCfg.border}`}>
                                                    <div className={`w-2 h-2 rounded-full ${turnoCfg.indicator}`}></div>
                                                    <turnoCfg.icone size={12} />
                                                    {turma.turno}
                                                </span>
                                            </td>
                                            <td className="py-5 px-8">
                                                <div className="flex flex-col gap-2 min-w-[140px]">
                                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                                                        <span className={ocupacao >= 100 ? 'text-rose-600' : 'text-slate-900'}>
                                                            {totalAlunos} / {lotacao} ALUNOS
                                                        </span>
                                                        <span className={ocupacao >= 90 ? 'text-rose-600 font-black' : 'text-slate-500'}>
                                                            {Math.round(ocupacao)}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${ocupacao >= 100 ? 'bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]' :
                                                                ocupacao >= 85 ? 'bg-amber-500' :
                                                                    'bg-indigo-600'
                                                                }`}
                                                            style={{ width: `${Math.min(ocupacao, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-8 text-right">
                                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Botao variante="ghost" tamanho="sm" icone={Edit2} onClick={() => abrirEdicao(turma)} title="Configurar Turma" className="hover:text-indigo-600" />
                                                    <Botao variante="ghost" tamanho="sm" icone={Trash2} onClick={() => excluirTurma(turma.id)} title="Remover Registro" className="hover:text-rose-600" />
                                                    <Botao variante="ghost" tamanho="sm" icone={ArrowRight} onClick={() => navegar(`/${escola.id}/admin/alunos?turma=${turma.id}`)} title="Ver Alunos" className="hover:text-indigo-600" />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </CartaoConteudo>

            {modalAberto && (
                <FormTurmaModal
                    turma={turmaEmEdicao}
                    aoFechar={() => definirModalAberto(false)}
                    aoSalvar={salvarTurma}
                />
            )}
        </LayoutAdministrativo>
    );
}
