import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { api } from '@compartilhado/servicos/api';
import {
    Users,
    Search,
    BookOpen,
    Clock,
    Plus,
    MoreVertical,
    Edit2,
    Trash2,
    ChevronDown,
    Filter,
    ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Turmas');
import { usarPermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';
import { Registrador } from '@compartilhado/servicos/auditoria';

import FormTurmaModal from './FormTurmaModal';

export default function Turmas() {
    const navegar = useNavigate();
    const { podeAcessar } = usarPermissoes();
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

    // Mapeamento de Cores por Turno
    const CORES_TURNO = {
        'Matutino': {
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            border: 'border-orange-200',
            indicator: 'bg-orange-600',
            gradient: 'from-orange-600 to-amber-600'
        },
        'Vespertino': {
            bg: 'bg-sky-50',
            text: 'text-sky-700',
            border: 'border-sky-200',
            indicator: 'bg-sky-600',
            gradient: 'from-sky-600 to-indigo-600'
        },
        'Noturno': {
            bg: 'bg-indigo-50',
            text: 'text-indigo-700',
            border: 'border-indigo-200',
            indicator: 'bg-indigo-700',
            gradient: 'from-indigo-700 to-violet-700'
        },
        'Integral': {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            indicator: 'bg-emerald-600',
            gradient: 'from-emerald-600 to-teal-600'
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
                    toast.error('Esta turma já existe!');
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

            toast.success(turmaEmEdicao ? 'Turma atualizada!' : 'Turma criada com sucesso!');
            definirModalAberto(false);
            carregarTurmas();
        } catch (erro) {
            log.error('Erro ao salvar', erro);
            toast.error('Falha ao salvar turma.');
        }
    };

    const excluirTurma = async (id) => {
        if (!window.confirm(`Tem certeza que deseja excluir a turma ${id}?`)) return;

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

            toast.success('Turma removida.');
            carregarTurmas();
        } catch (erro) {
            log.error('Erro ao excluir', erro);
            toast.error('Erro ao excluir turma.');
        }
    };

    const abrirEdicao = (turma) => {
        definirTurmaEmEdicao(turma);
        definirModalAberto(true);
    };

    const abrirNovo = () => {
        definirTurmaEmEdicao(null);
        definirModalAberto(true);
    };

    const turmasFiltradas = turmas.filter(t => {
        const matchBusca = t.id.toLowerCase().includes(termoBusca.toLowerCase());
        const matchTurno = filtroTurno === 'TODOS' || t.turno === filtroTurno;
        const matchAno = t.ano_letivo.toString() === filtroAnoLetivo;
        return matchBusca && matchTurno && matchAno;
    });

    if (!podeAcessar('turmas', 'visualizar')) {
        return (
            <LayoutAdministrativo titulo="Gestão de Turmas" subtitulo="" acoes={null}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-slate-500">Acesso negado.</p>
                </div>
            </LayoutAdministrativo>
        );
    }

    const AcoesHeader = (
        <button
            onClick={abrirNovo}
            className="group flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm"
        >
            <Plus size={18} />
            <span>Nova Turma</span>
        </button>
    );

    return (
        <LayoutAdministrativo titulo="Gestão de Turmas" subtitulo="Administração de classes e turnos" acoes={AcoesHeader}>

            {/* Toolbar de Filtros - Flat Design */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 sticky top-4 z-20">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar por série, letra ou turno..."
                        value={termoBusca}
                        onChange={(e) => definirTermoBusca(e.target.value)}
                        className="w-full pl-11 pr-4 py-2 bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md text-sm outline-none transition-all placeholder:text-gray-400"
                    />
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
                    <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200">
                        {[new Date().getFullYear().toString(), (new Date().getFullYear() + 1).toString()].map((ano) => (
                            <button
                                key={ano}
                                onClick={() => definirFiltroAnoLetivo(ano)}
                                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors outline-none cursor-pointer ${filtroAnoLetivo === ano
                                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {ano}
                            </button>
                        ))}
                    </div>

                    <div className="hidden md:block h-6 w-px bg-gray-200 mx-1"></div>

                    <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200 overflow-x-auto">
                        {['TODOS', 'Matutino', 'Vespertino', 'Noturno', 'Integral'].map((filtro) => (
                            <button
                                key={filtro}
                                onClick={() => definirFiltroTurno(filtro)}
                                className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors outline-none cursor-pointer ${filtroTurno === filtro
                                    ? 'bg-gray-800 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                                    }`}
                            >
                                {filtro === 'TODOS' ? 'Todos os Turnos' : filtro}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid de Cards */}
            {carregando ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-48 bg-slate-100/50 rounded-xl"></div>
                    ))}
                </div>
            ) : turmasFiltradas.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto border border-gray-200">
                        <BookOpen size={24} className="text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma turma encontrada</h3>
                    <p className="text-gray-500 max-w-sm mx-auto text-sm">
                        Tente ajustar seus filtros ou cadastre uma nova turma.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Turma</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Professor Regente</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Sala</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Turno</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Ocupação / Vagas</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {turmasFiltradas.length > 0 ? turmasFiltradas.map((turma) => {
                                        const lotacao = turma.lotacao_maxima || 40;
                                        const totalAlunos = turma.totalAlunos || 0;
                                        const ocupacao = (totalAlunos / lotacao) * 100;
                                        const turnoInfo = CORES_TURNO[turma.turno as keyof typeof CORES_TURNO] || {
                                            bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', indicator: 'bg-gray-500'
                                        };

                                        return (
                                            <tr
                                                key={turma.id}
                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => navegar(`/pedagogico/alunos?turma=${turma.id}`)}
                                            >
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200 shrink-0">
                                                            {turma.serie}
                                                        </div>
                                                        <span className="font-semibold text-gray-900">{turma.serie}º {turma.letra}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-900">{turma.professor_regente || 'Não definido'}</span>
                                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Ano Letivo {turma.ano_letivo}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="text-sm font-medium text-gray-900 bg-gray-100 border border-gray-200 px-2 py-1 rounded">
                                                        {turma.sala || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${turnoInfo.bg} ${turnoInfo.text} ${turnoInfo.border}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${turnoInfo.indicator}`}></div>
                                                        {turma.turno}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-sm">
                                                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                                                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase">
                                                            <span className={ocupacao >= 100 ? 'text-red-700' : 'text-gray-900'}>
                                                                {totalAlunos} / {lotacao}
                                                            </span>
                                                            <span className={ocupacao >= 90 ? 'text-amber-700' : 'text-gray-600'}>
                                                                {Math.round(ocupacao)}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-300 ${ocupacao >= 100 ? 'bg-red-600' :
                                                                    ocupacao >= 85 ? 'bg-amber-500' :
                                                                        'bg-blue-600'
                                                                    }`}
                                                                style={{ width: `${Math.min(ocupacao, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => abrirEdicao(turma)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                                                            title="Editar Turma"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => excluirTurma(turma.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                                                            title="Excluir Turma"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">Nenhuma turma encontrada com os filtros atuais.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Turma Padronizado */}
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

