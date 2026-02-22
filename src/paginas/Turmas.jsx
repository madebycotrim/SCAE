import { useState, useEffect } from 'react';
import { usePermissoes } from '../contexts/ContextoPermissoes';
import LayoutAdministrativo from '../componentes/LayoutAdministrativo';
import ModalUniversal from '../componentes/ModalUniversal';
import { bancoLocal } from '../servicos/bancoLocal';
import { api } from '../servicos/api';
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
import { Registrador } from '../servicos/registrador';

export default function Turmas() {
    const { podeAcessar } = usePermissoes();
    const [turmas, definirTurmas] = useState([]);
    const [carregando, definirCarregando] = useState(true);
    const [modalAberto, definirModalAberto] = useState(false);
    const [turmaEmEdicao, definirTurmaEmEdicao] = useState(null);
    const [termoBusca, definirTermoBusca] = useState('');
    const [filtroTurno, definirFiltroTurno] = useState('TODOS'); // 'TODOS', 'Matutino', 'Vespertino', 'Noturno'

    // Form states
    const [serieTurma, definirSerieTurma] = useState(''); // "1", "2", "3"
    const [letraTurma, definirLetraTurma] = useState(''); // "A", "B", ...
    const [turno, definirTurno] = useState('Matutino');
    const [anoLetivo, definirAnoLetivo] = useState(new Date().getFullYear().toString());

    // Mapeamento de Cores por Turno
    const CORES_TURNO = {
        'Matutino': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', gradient: 'from-amber-400 to-orange-500' },
        'Vespertino': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-400 to-indigo-500' },
        'Noturno': { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', gradient: 'from-violet-400 to-purple-500' },
        'Integral': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-400 to-teal-500' }
    };

    const carregarTurmas = async () => {
        try {
            definirCarregando(true);
            const banco = await bancoLocal.iniciarBanco();
            const todasTurmas = await banco.getAll('turmas');

            // Contagem otimizada usando índice do banco
            const turmasComContagem = await Promise.all(todasTurmas.map(async (t) => {
                const count = await bancoLocal.contarAlunosPorTurma(t.id);
                return { ...t, totalAlunos: count };
            }));

            // Ordenar: 1º Ano -> 3º Ano, depois por Letra
            turmasComContagem.sort((a, b) => {
                if (a.id < b.id) return -1;
                if (a.id > b.id) return 1;
                return 0;
            });

            definirTurmas(turmasComContagem);
        } catch (erro) {
            console.error('Erro ao carregar turmas:', erro);
            toast.error('Erro ao carregar a lista de turmas.');
        } finally {
            definirCarregando(false);
        }
    };

    useEffect(() => {
        carregarTurmas();
    }, []);

    const salvarTurma = async () => {
        if (!serieTurma || !letraTurma || !turno) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        const idTurma = `${serieTurma}º ${letraTurma}`;

        const novaTurma = {
            id: idTurma,
            serie: serieTurma,
            letra: letraTurma,
            turno,
            ano_letivo: parseInt(anoLetivo),
            criado_em: turmaEmEdicao ? turmaEmEdicao.criado_em : new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };

        try {
            const banco = await bancoLocal.iniciarBanco();

            // Verificar duplicidade na criação
            if (!turmaEmEdicao) {
                const existente = await banco.get('turmas', idTurma);
                if (existente) {
                    toast.error('Esta turma já existe!');
                    return;
                }
            }

            await banco.put('turmas', novaTurma);

            if (navigator.onLine) {
                try {
                    await api.enviar(`/turmas/${idTurma}`, novaTurma);
                } catch (e) {
                    console.warn('Erro sync nuvem:', e);
                }
            }

            // Log de Auditoria
            const acaoLog = turmaEmEdicao ? 'TURMA_EDITAR' : 'TURMA_CRIAR';
            await Registrador.registrar(acaoLog, 'turma', idTurma, {
                ano_letivo: novaTurma.ano_letivo,
                turno: novaTurma.turno
            });

            toast.success(turmaEmEdicao ? 'Turma atualizada!' : 'Turma criada com sucesso!');
            definirModalAberto(false);
            carregarTurmas();
            limparForm();
        } catch (erro) {
            console.error('Erro ao salvar:', erro);
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
                    await api.delete(`/turmas/${id}`);
                } catch (e) {
                    console.warn('Erro sync nuvem:', e);
                }
            }

            // Log de Auditoria
            await Registrador.registrar('TURMA_EXCLUIR', 'turma', id, {});

            toast.success('Turma removida.');
            carregarTurmas();
        } catch (erro) {
            console.error('Erro ao excluir:', erro);
            toast.error('Erro ao excluir turma.');
        }
    };

    const abrirEdicao = (turma) => {
        definirTurmaEmEdicao(turma);
        definirSerieTurma(turma.id.split('º')[0]);
        definirLetraTurma(turma.letra);
        definirTurno(turma.turno);
        definirAnoLetivo(turma.ano_letivo.toString());
        definirModalAberto(true);
    };

    const abrirNovo = () => {
        limparForm();
        definirModalAberto(true);
    };

    const limparForm = () => {
        definirTurmaEmEdicao(null);
        definirSerieTurma('');
        definirLetraTurma('');
        definirTurno('Matutino');
        definirAnoLetivo(new Date().getFullYear().toString());
    };

    // Filtragem
    const turmasFiltradas = turmas.filter(t => {
        const matchBusca = t.id.toLowerCase().includes(termoBusca.toLowerCase());
        const matchTurno = filtroTurno === 'TODOS' || t.turno === filtroTurno;
        return matchBusca && matchTurno;
    });

    if (!podeAcessar('turmas', 'visualizar')) {
        return (
            <LayoutAdministrativo titulo="Gestão de Turmas">
                <div className="flex justify-center items-center h-64">
                    <p className="text-slate-500">Acesso negado.</p>
                </div>
            </LayoutAdministrativo>
        );
    }

    const AcoesHeader = (
        <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 border border-white/10"
        >
            <Plus size={20} />
            <span className="hidden sm:inline">Nova Turma</span>
        </button>
    );

    return (
        <LayoutAdministrativo titulo="Gestão de Turmas" subtitulo="Administração de classes e turnos" acoes={AcoesHeader}>

            {/* Toolbar de Filtros */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-8 flex flex-col md:flex-row gap-4 sticky top-0 z-20">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar turma (ex: 1º A)..."
                        value={termoBusca}
                        onChange={(e) => definirTermoBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all placeholder:text-slate-400 shadow-sm"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
                    {['TODOS', 'Matutino', 'Vespertino', 'Noturno'].map((filtro) => (
                        <button
                            key={filtro}
                            onClick={() => definirFiltroTurno(filtro)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filtroTurno === filtro
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {filtro === 'TODOS' ? 'Todos' : filtro}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid de Cards */}
            {carregando ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-48 bg-slate-100/50 rounded-3xl"></div>
                    ))}
                </div>
            ) : turmasFiltradas.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 mx-auto shadow-sm border border-slate-100">
                        <BookOpen size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-700 mb-2">Nenhuma turma encontrada</h3>
                    <p className="text-slate-400 max-w-xs mx-auto text-sm font-medium">
                        Tente ajustar seus filtros ou cadastre uma nova turma.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up">
                    {turmasFiltradas.map((turma, index) => {
                        const cores = CORES_TURNO[turma.turno] || CORES_TURNO['Matutino'];

                        return (
                            <div
                                key={turma.id}
                                className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                            >
                                {/* Header Colorido */}
                                <div className={`h-24 bg-gradient-to-br ${cores.gradient} relative p-4 flex justify-between items-start`}>
                                    <div className="bg-white/20 backdrop-blur-md rounded-lg px-2.5 py-1 text-[10px] font-black uppercase text-white tracking-wider border border-white/10 shadow-sm">
                                        {turma.turno}
                                    </div>

                                    {/* Menu Actions (Hover) */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => abrirEdicao(turma)}
                                            className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white transition backdrop-blur-md"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => excluirTurma(turma.id)}
                                            className="p-1.5 bg-white/20 hover:bg-rose-500/80 rounded-lg text-white transition backdrop-blur-md"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* Big Letter BG */}
                                    <span className="absolute -bottom-4 -right-2 text-[100px] font-black text-white/20 leading-none select-none pointer-events-none">
                                        {turma.letra}
                                    </span>
                                </div>

                                <div className="p-6 relative">
                                    <div className="absolute -top-10 left-6">
                                        <div className="w-16 h-16 bg-white rounded-2xl p-1 shadow-lg ring-1 ring-black/5">
                                            <div className="w-full h-full bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                                                <span className="text-2xl font-black text-slate-800">{turma.id.split('º')[0]}º</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <h3 className="text-xl font-black text-slate-800 leading-tight mb-1">
                                            Turma {turma.letra}
                                        </h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-5">
                                            Ano Letivo {turma.ano_letivo}
                                        </p>

                                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-500">
                                                <Users size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase">Alunos</p>
                                                <p className="text-lg font-black text-slate-800">{turma.totalAlunos || 0}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 group/btn">
                                        Ver Detalhes
                                        <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Criar/Editar */}
            {modalAberto && (
                <ModalUniversal
                    titulo={turmaEmEdicao ? "Editar Informações da Turma" : "Criar Nova Turma"}
                    subtitulo={turmaEmEdicao ? `Alterando dados da turma ${turmaEmEdicao.id}` : "Defina a série, turno e letra para criar uma nova turma."}
                    fechavel
                    aoFechar={() => definirModalAberto(false)}
                >
                    <div className="space-y-6">

                        {/* Série (Ano) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Série</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['1', '2', '3'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => !turmaEmEdicao && definirSerieTurma(s)}
                                        disabled={!!turmaEmEdicao}
                                        className={`
                                            h-16 rounded-xl border-2 text-xl font-black transition-all flex items-center justify-center gap-1
                                            ${serieTurma === s
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md transform scale-[1.02]'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-slate-50'}
                                            ${turmaEmEdicao ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {s}º <span className="text-xs font-bold opacity-60 mt-1">ANO</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Turno */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Turno</label>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {['Matutino', 'Vespertino', 'Noturno', 'Integral'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => definirTurno(t)}
                                        className={`
                                            h-14 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-2
                                            ${turno === t
                                                ? 'bg-white border-indigo-600 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10'
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}
                                        `}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Letra da Turma */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Turma (Letra)</label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((l) => (
                                    <button
                                        key={l}
                                        onClick={() => !turmaEmEdicao && definirLetraTurma(l)}
                                        disabled={!!turmaEmEdicao}
                                        className={`
                                            aspect-square rounded-xl border-2 text-sm font-black transition-all flex items-center justify-center
                                            ${letraTurma === l
                                                ? 'bg-slate-800 border-slate-800 text-white shadow-md transform scale-105'
                                                : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'}
                                            ${turmaEmEdicao ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer Ações */}
                        <div className="flex gap-4 pt-6 mt-2 border-t border-slate-100">
                            <button
                                onClick={() => definirModalAberto(false)}
                                className="flex-1 py-4 px-6 rounded-xl border border-transparent text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 transition-all uppercase tracking-wide text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={salvarTurma}
                                className="flex-[2] py-4 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 uppercase tracking-wide text-xs"
                            >
                                <BookOpen size={18} className="text-indigo-200" />
                                {turmaEmEdicao ? 'Salvar Alterações' : 'Criar Turma'}
                            </button>
                        </div>
                    </div>
                </ModalUniversal>
            )}
        </LayoutAdministrativo>
    );
}
