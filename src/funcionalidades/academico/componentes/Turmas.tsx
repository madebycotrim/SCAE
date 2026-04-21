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

/**
 * Componente de gestão de turmas e controle de capacidade acadêmica.
 */
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

    // Configuração visual por Turno (Padrão Luxury 2xl)
    const CONFIGURACAO_TURNO = {
        'Matutino': {
            fundo: 'bg-amber-50',
            texto: 'text-amber-700',
            borda: 'border-amber-200',
            indicador: 'bg-amber-400',
            icone: Sun
        },
        'Vespertino': {
            fundo: 'bg-sky-50',
            texto: 'text-sky-700',
            borda: 'border-sky-200',
            indicador: 'bg-sky-400',
            icone: CloudSun
        },
        'Noturno': {
            fundo: 'bg-slate-50',
            texto: 'text-slate-700',
            borda: 'border-slate-200',
            indicador: 'bg-slate-600',
            icone: Moon
        },
        'Integral': {
            fundo: 'bg-emerald-50',
            texto: 'text-emerald-700',
            borda: 'border-emerald-200',
            indicador: 'bg-emerald-500',
            icone: Zap
        }
    };

    /**
     * Persiste os dados da turma no serviço de backend.
     * @param {Object} dadosTurma - Objeto contendo as informações da turma.
     */
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

    const turmasFiltradas = turmas.filter(turma => {
        const correspondeBusca = turma.id.toLowerCase().includes(termoBusca.toLowerCase()) ||
            (turma.professor_regente || '').toLowerCase().includes(termoBusca.toLowerCase());
        const correspondeTurno = filtroTurno === 'TODOS' || turma.turno === filtroTurno;
        const correspondeAno = turma.ano_letivo.toString() === filtroAnoLetivo;
        return correspondeBusca && correspondeTurno && correspondeAno;
    });

    if (!podeAcessar('turmas', 'visualizar')) {
        return (
            <LayoutAdministrativo 
                titulo="Turmas" 
                subtitulo="Acesso Restrito — Permissões insuficientes" 
                acoes={null}
            >
                <div className="flex flex-col items-center justify-center h-96 gap-4 text-slate-400 opacity-50 grayscale">
                    <BookOpen size={64} strokeWidth={1} />
                    <p className="font-black uppercase tracking-widest text-[11px]">Você não tem permissão para ver esta página</p>
                </div>
            </LayoutAdministrativo>
        );
    }

    const AcoesCabecalho = (
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
            titulo="Turmas"
            subtitulo="Organização de turmas, ciclos letivos e capacidade de alocação"
            acoes={AcoesCabecalho}
        >
            {/* Métricas Minimalistas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <CardMetrica
                    label="Turmas"
                    valor={turmas.length}
                    icone={Grid}
                    className="!shadow-none !border-slate-100"
                />
                <CardMetrica
                    label="Alunos"
                    valor={turmas.reduce((acc, t) => acc + (t.totalAlunos || 0), 0)}
                    icone={Users}
                    className="!shadow-none !border-slate-100"
                />
                <CardMetrica
                    label="Assentos Livres"
                    valor={turmas.reduce((acc, t) => acc + (t.lotacao_maxima || 40), 0) - turmas.reduce((acc, t) => acc + (t.totalAlunos || 0), 0)}
                    subtitulo="Vagas Disponíveis"
                    icone={GraduationCap}
                    className="!shadow-none !border-slate-100"
                />
                <CardMetrica
                    label="Sem Professor"
                    valor={turmas.filter(t => !t.professor_regente).length}
                    subtitulo="Déficit de Regência"
                    icone={Activity}
                    className="!shadow-none !border-slate-100"
                />
            </div>

            <BarraFiltro>
                <div className="flex flex-col gap-2 flex-1 w-full">
                    <label className="text-[10px] font-bold text-slate-800 uppercase tracking-widest ml-1 leading-none">Localizar Turma</label>
                    <InputBusca
                        icone={Search}
                        placeholder="Série, professor..."
                        value={termoBusca}
                        onChange={(e) => definirTermoBusca(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-800 uppercase tracking-widest ml-1 leading-none">Ano Letivo</label>
                    <div className="flex items-center bg-slate-100/50 p-1 rounded-xl h-10 min-w-[140px]">
                        {[new Date().getFullYear().toString(), (new Date().getFullYear() + 1).toString()].map((ano) => (
                            <button
                                key={ano}
                                onClick={() => definirFiltroAnoLetivo(ano)}
                                className={`flex-1 h-full rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filtroAnoLetivo === ano
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {ano}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-800 uppercase tracking-widest ml-1 leading-none">Filtro de Turno</label>
                    <div className="flex items-center bg-slate-100/50 p-1 rounded-xl h-10 min-w-[400px]">
                        {['TODOS', 'Matutino', 'Vespertino', 'Noturno', 'Integral'].map((filtro) => {
                            return (
                                <button
                                    key={filtro}
                                    onClick={() => definirFiltroTurno(filtro as any)}
                                    className={`flex-1 h-full rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filtroTurno === filtro
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {filtro === 'TODOS' ? 'Todos' : filtro}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </BarraFiltro>

            {/* Tabela SaaS High-End */}
            <CartaoConteudo className="mt-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
                {carregandoInicial ? (
                    <div className="py-20 flex flex-col items-center gap-2 text-slate-300">
                         <Loader2 size={24} className="animate-spin text-slate-400" />
                         <span className="text-[9px] font-bold uppercase tracking-widest">Sincronizando...</span>
                    </div>
                ) : turmasFiltradas.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center px-8">
                        <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mb-6 border border-slate-100">
                            <Layers size={32} className="text-slate-200" />
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1">Nenhuma Turma</h3>
                        <p className="text-[9px] font-medium text-slate-400 max-w-xs mx-auto uppercase tracking-tighter">Crie uma nova turma para gerenciar os dados.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identificação</th>
                                    <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Professor Regente</th>
                                    <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Localização</th>
                                    <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Turno</th>
                                    <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ocupação</th>
                                    <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {turmasFiltradas.map((turma) => {
                                    const lotacao = turma.lotacao_maxima || 40;
                                    const totalAlunos = turma.totalAlunos || 0;
                                    const ocupacao = (totalAlunos / lotacao) * 100;
                                    const turnoCfg = CONFIGURACAO_TURNO[turma.turno as keyof typeof CONFIGURACAO_TURNO] || {
                                        fundo: 'bg-slate-100', texto: 'text-slate-700', borda: 'border-slate-200', indicador: 'bg-slate-500', icone: Clock
                                    };

                                    return (
                                        <tr
                                            key={turma.id}
                                            className="hover:bg-slate-50/50 transition-all duration-150 group cursor-pointer"
                                            onClick={() => navegar(`/${escola.id}/admin/alunos?turma=${turma.id}`)}
                                        >
                                            <td className="py-6 px-8">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">{turma.serie}º {turma.letra}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ano {turma.ano_letivo}</span>
                                                </div>
                                            </td>
                                            <td className="py-6 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                                                         <GraduationCap size={16} />
                                                     </div>
                                                    <span className="text-sm font-bold text-slate-800 tracking-tight uppercase">{turma.professor_regente || 'Não designado'}</span>
                                                </div>
                                            </td>
                                            <td className="py-6 px-8 text-center">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-tight rounded-lg border border-slate-200 shadow-sm">
                                                    {turma.sala || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="py-6 px-8">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${turnoCfg.fundo} ${turnoCfg.texto} ${turnoCfg.borda}`}>
                                                    <div className={`w-1 h-1 rounded-full ${turnoCfg.indicador}`}></div>
                                                    {turma.turno}
                                                </span>
                                            </td>
                                            <td className="py-6 px-8">
                                                <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                                        <span className="text-slate-500">{totalAlunos} / {lotacao} Alunos</span>
                                                        <span className="text-slate-900">{ocupacao.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${ocupacao >= 100 ? 'bg-rose-500' :
                                                                ocupacao >= 85 ? 'bg-amber-400' :
                                                                    'bg-slate-900'
                                                                }`}
                                                            style={{ width: `${Math.min(ocupacao, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 px-8 text-right">
                                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Botao variante="ghost" tamanho="sm" icone={Edit2} onClick={() => abrirEdicao(turma)} className="hover:bg-slate-100 rounded-lg p-2" />
                                                    <Botao variante="ghost" tamanho="sm" icone={Trash2} onClick={() => excluirTurma(turma.id)} className="hover:bg-rose-50 hover:text-rose-600 rounded-lg p-2" />
                                                    <button 
                                                        className="w-9 h-9 flex items-center justify-center bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all shadow-lg active:scale-90"
                                                        onClick={() => navegar(`/${escola.id}/admin/alunos?turma=${turma.id}`)}
                                                    >
                                                        <ArrowRight size={14} />
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

