import { useState, useMemo } from 'react';
import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { Botao, BarraFiltro, InputBusca } from '@compartilhado/componentes/UI';
import { Plus, Search, Upload, Calendar, Layers, CheckCircle2, XCircle, Grid } from 'lucide-react';
import toast from 'react-hot-toast';

import { alunoServico } from '../servicos/aluno.servico';
import { Aluno } from '../types/aluno';

import { usarNotificacoes } from '@compartilhado/contextos/ContextoNotificacoes';
import { usarEscola } from '@escola/ProvedorEscola';

import CredencialModal from './CredencialModal';
import BarraSelecaoLote from './BarraSelecaoLote';
import ListaAlunos from './ListaAlunos';
import FormAlunoModal from './FormAlunoModal';
import ImportacaoAlunosModal from './ImportacaoAlunosModal';
import PromocaoLoteModal from './PromocaoLoteModal';

export default function Alunos() {
    const { adicionarNotificacao } = usarNotificacoes();
    const escola = usarEscola();

    const { dados, carregando, recarregar } = usarConsulta(
        ['alunos-e-turmas'],
        () => alunoServico.carregarDadosIniciais()
    );
    const alunos = (dados?.alunos as Aluno[]) || [];
    const turmas = dados?.turmas || [];

    const [termoBusca, definirTermoBusca] = useState('');
    const [filtroStatus, definirFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
    const [filtroAnoLetivo, definirFiltroAnoLetivo] = useState(new Date().getFullYear().toString());
    const [paginaAtual, definirPaginaAtual] = useState(1);
    const itensPorPagina = 12;

    const [modalForm, definirModalForm] = useState(false);
    const [modalImport, definirModalImport] = useState(false);
    const [modalPromocao, definirModalPromocao] = useState(false);
    const [modalQRCode, definirModalQRCode] = useState(false);
    const [alunoEmEdicao, definirAlunoEmEdicao] = useState<Aluno | null>(null);
    const [qrcodeAtual, definirQrcodeAtual] = useState('');
    const [alunosSelecionados, definirAlunosSelecionados] = useState<string[]>([]);

    const alunosFiltrados = useMemo(() => {
        return alunos.filter(a => {
            const termoLower = termoBusca.toLowerCase();
            const matchNome = a.nome_completo.toLowerCase().includes(termoLower) ||
                a.matricula.includes(termoBusca) ||
                (a.turma_id || '').toLowerCase().includes(termoLower);

            const matchStatus = filtroStatus === 'todos'
                ? true
                : filtroStatus === 'ativos' ? a.ativo !== false : a.ativo === false;

            const turmaDoAluno = turmas.find(t => t.id === a.turma_id);
            const matchAno = turmaDoAluno ? turmaDoAluno.ano_letivo.toString() === filtroAnoLetivo : true;

            return matchNome && matchAno && matchStatus;
        });
    }, [alunos, turmas, termoBusca, filtroAnoLetivo, filtroStatus]);

    const totalPaginas = Math.ceil(alunosFiltrados.length / itensPorPagina);
    const paginados = alunosFiltrados.slice(
        (paginaAtual - 1) * itensPorPagina,
        paginaAtual * itensPorPagina
    );

    const salvarAluno = async (dadosForm: any) => {
        try {
            await alunoServico.salvarAluno({ ...dadosForm, criado_em: alunoEmEdicao?.criado_em || new Date().toISOString() }, !!alunoEmEdicao);
            toast.success(alunoEmEdicao ? 'Registro de aluno atualizado' : 'Novo aluno matriculado com sucesso');
            definirModalForm(false);
            recarregar();
        } catch (erro: any) { toast.error(erro.message || 'Falha ao processar registro.'); }
    };

    const excluirAluno = async (aluno: Aluno) => {
        if (!window.confirm(`Tem certeza que deseja remover o registro de ${aluno.nome_completo}?`)) return;
        try {
            await alunoServico.excluirAluno(aluno.matricula);
            toast.success('Registro removido do sistema');
            recarregar();
        } catch (erro) { toast.error('Erro na exclusão do registro.'); }
    };

    const promoverLote = async (novaTurmaId: string) => {
        try {
            await alunoServico.promoverEmLote(alunosSelecionados, novaTurmaId);
            toast.success(`Enturmação em lote concluída para ${alunosSelecionados.length} alunos`);
            definirAlunosSelecionados([]);
            definirModalPromocao(false);
            recarregar();
        } catch (erro) { toast.error('Falha na operação em lote.'); }
    };

    const importarAlunos = async (jsonData: any[]) => {
        const resultado = await alunoServico.importarAlunos(jsonData, alunos);
        adicionarNotificacao({
            titulo: 'Importação Finalizada',
            mensagem: `Lote de ${resultado.total} processado. Sucessos: ${resultado.sucessos}, Falhas: ${resultado.erros}.`,
            tipo: resultado.erros > 0 ? 'warning' : 'success',
            link: `/${escola.id}/admin/alunos`
        });
        if (resultado.sucessos > 0) recarregar();
        return resultado;
    };

    const obterCorAvatar = (id: string) => {
        const cores = ['from-indigo-500 to-purple-600', 'from-emerald-400 to-teal-600', 'from-rose-400 to-pink-600', 'from-amber-400 to-orange-500', 'from-sky-400 to-blue-600', 'from-violet-500 to-fuchsia-600'];
        return cores[parseInt(id.slice(-1)) % cores.length || 0];
    };

    const AcoesHeader = (
        <div className="flex gap-3">
            <Botao
                variante="secundario"
                tamanho="lg"
                icone={Upload}
                onClick={() => definirModalImport(true)}
                className="hidden md:flex"
            >
                Importar Dados
            </Botao>
            <Botao
                variante="primario"
                tamanho="lg"
                icone={Plus}
                onClick={() => { definirAlunoEmEdicao(null); definirModalForm(true); }}
            >
                Matricular Aluno
            </Botao>
        </div>
    );

    return (
        <LayoutAdministrativo
            titulo="Gestão de Discentes"
            subtitulo="Controle unificado de matrículas e identidades digitais"
            acoes={AcoesHeader}
        >
            <BarraFiltro className="bg-slate-50 border-slate-200/60 shadow-sm p-4 rounded-[2rem]">
                <div className="flex flex-col gap-2.5 flex-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Pesquisa de Discentes</label>
                    <InputBusca
                        icone={Search}
                        placeholder="Nome, matrícula ou identificador de turma..."
                        value={termoBusca}
                        onChange={(e) => definirTermoBusca(e.target.value)}
                        className="w-full h-12 rounded-2xl"
                    />
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-6 items-end">
                    {/* Filtro de Ano Letivo */}
                    <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Ciclo Acadêmico</label>
                        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 h-12 shadow-sm">
                            {[new Date().getFullYear().toString(), (new Date().getFullYear() + 1).toString()].map((ano) => (
                                <button
                                    key={ano}
                                    onClick={() => definirFiltroAnoLetivo(ano)}
                                    className={`px-5 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtroAnoLetivo === ano ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Calendar size={12} /> {ano}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filtro de Status */}
                    <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Status de Matrícula</label>
                        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 h-12 shadow-sm">
                            {(['ativos', 'inativos', 'todos'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => definirFiltroStatus(status)}
                                    className={`px-4 h-full rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${filtroStatus === status ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                                >
                                    {status === 'ativos' && <CheckCircle2 size={12} />}
                                    {status === 'inativos' && <XCircle size={12} />}
                                    {status === 'todos' && <Grid size={12} />}
                                    {status === 'ativos' ? 'Matriculados' : status === 'inativos' ? 'Inativos' : 'Todos'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </BarraFiltro>

            <ListaAlunos
                alunos={paginados}
                alunosSelecionados={alunosSelecionados}
                paginaAtual={paginaAtual}
                totalPaginas={totalPaginas}
                aoSelecionar={(m) => definirAlunosSelecionados(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                aoVerQRCode={(m) => { definirQrcodeAtual(m); definirModalQRCode(true); }}
                aoEditar={(a) => { definirAlunoEmEdicao(a); definirModalForm(true); }}
                aoExcluir={excluirAluno}
                aoMudarPagina={definirPaginaAtual}
                obterCorAvatar={obterCorAvatar}
            />

            <BarraSelecaoLote
                quantidade={alunosSelecionados.length}
                aoPromover={() => definirModalPromocao(true)}
                aoCancelar={() => definirAlunosSelecionados([])}
            />

            {modalForm && <FormAlunoModal aluno={alunoEmEdicao} turmas={turmas} aoFechar={() => definirModalForm(false)} aoSalvar={salvarAluno} />}
            {modalImport && <ImportacaoAlunosModal aoFechar={() => definirModalImport(false)} onImport={importarAlunos} />}
            {modalPromocao && <PromocaoLoteModal quantidade={alunosSelecionados.length} turmas={turmas} aoFechar={() => definirModalPromocao(false)} aoPromover={promoverLote} />}
            {modalQRCode && <CredencialModal matricula={qrcodeAtual} aoFechar={() => definirModalQRCode(false)} />}
        </LayoutAdministrativo>
    );
}
