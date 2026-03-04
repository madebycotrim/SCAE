import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { Plus, Search, Filter, Upload, QrCode, ChevronDown } from 'lucide-react';
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

/**
 * Página principal de Gestão de Alunos.
 */
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
            toast.success(alunoEmEdicao ? 'Aluno atualizado!' : 'Aluno cadastrado!');
            definirModalForm(false);
            recarregar();
        } catch (erro: any) { toast.error(erro.message || 'Falha ao salvar aluno.'); }
    };

    const excluirAluno = async (aluno: Aluno) => {
        if (!window.confirm(`Excluir aluno ${aluno.nome_completo}?`)) return;
        try {
            await alunoServico.excluirAluno(aluno.matricula);
            toast.success('Aluno removido.');
            recarregar();
        } catch (erro) { toast.error('Erro ao excluir aluno.'); }
    };

    const promoverLote = async (novaTurmaId: string) => {
        try {
            await alunoServico.promoverEmLote(alunosSelecionados, novaTurmaId);
            toast.success(`${alunosSelecionados.length} alunos promovidos!`);
            definirAlunosSelecionados([]);
            definirModalPromocao(false);
            recarregar();
        } catch (erro) { toast.error('Falha ao promover alunos.'); }
    };

    const importarAlunos = async (jsonData: any[]) => {
        const resultado = await alunoServico.importarAlunos(jsonData, alunos);
        adicionarNotificacao({
            titulo: 'Importação Concluída',
            mensagem: `Processados ${resultado.total} registros. Sucessos: ${resultado.sucessos}, Falhas: ${resultado.erros}.`,
            tipo: resultado.erros > 0 ? 'warning' : 'success',
            link: `/${escola.id}/admin/alunos`
        });
        if (resultado.sucessos > 0) recarregar();
        return resultado;
    };

    const getAvatarColor = (id: string) => {
        const cores = ['from-indigo-500 to-purple-600', 'from-emerald-400 to-teal-600', 'from-rose-400 to-pink-600', 'from-amber-400 to-orange-500', 'from-sky-400 to-blue-600', 'from-violet-500 to-fuchsia-600'];
        return cores[parseInt(id.slice(-1)) % cores.length || 0];
    };

    const AcoesHeader = (
        <div className="flex gap-2">
            <button onClick={() => definirModalImport(true)} className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors">
                <Upload size={18} /> Importar
            </button>
            <button onClick={() => { definirAlunoEmEdicao(null); definirModalForm(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm">
                <Plus size={18} /> <span className="hidden sm:inline">Matricular Aluno</span>
            </button>
        </div>
    );

    return (
        <LayoutAdministrativo titulo="Gestão de Alunos" subtitulo="Cadastro e controle de matrículas" acoes={AcoesHeader}>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center gap-4 sticky top-4 z-20">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <input type="text" placeholder="Buscar por nome, matrícula ou turma..." value={termoBusca} onChange={(e) => definirTermoBusca(e.target.value)} className="w-full pl-11 pr-4 h-10 bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md text-sm outline-none transition-all placeholder:text-gray-400" />
                </div>
                <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
                    <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200 h-10">
                        {[new Date().getFullYear().toString(), (new Date().getFullYear() + 1).toString()].map((ano) => (
                            <button key={ano} onClick={() => definirFiltroAnoLetivo(ano)} className={`px-4 h-full rounded text-sm font-medium transition-colors outline-none cursor-pointer flex items-center justify-center ${filtroAnoLetivo === ano ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}>{ano}</button>
                        ))}
                    </div>
                    <div className="hidden md:block h-6 w-px bg-slate-200 mx-1"></div>
                    <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200 h-10 overflow-x-auto">
                        {(['ativos', 'inativos', 'todos'] as const).map((status) => (
                            <button key={status} onClick={() => definirFiltroStatus(status)} className={`px-4 h-full rounded text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors outline-none cursor-pointer flex items-center justify-center ${filtroStatus === status ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}>{status === 'ativos' ? 'Matriculados' : status === 'inativos' ? 'Inativos' : 'Todos'}</button>
                        ))}
                    </div>
                </div>
            </div>

            <ListaAlunos alunos={paginados} alunosSelecionados={alunosSelecionados} paginaAtual={paginaAtual} totalPaginas={totalPaginas} aoSelecionar={(m) => definirAlunosSelecionados(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} aoVerQRCode={(m) => { definirQrcodeAtual(m); definirModalQRCode(true); }} aoEditar={(a) => { definirAlunoEmEdicao(a); definirModalForm(true); }} aoExcluir={excluirAluno} aoMudarPagina={definirPaginaAtual} getAvatarColor={getAvatarColor} />

            <BarraSelecaoLote quantidade={alunosSelecionados.length} aoPromover={() => definirModalPromocao(true)} aoCancelar={() => definirAlunosSelecionados([])} />

            {modalForm && <FormAlunoModal aluno={alunoEmEdicao} turmas={turmas} aoFechar={() => definirModalForm(false)} aoSalvar={salvarAluno} />}
            {modalImport && <ImportacaoAlunosModal aoFechar={() => definirModalImport(false)} onImport={importarAlunos} />}
            {modalPromocao && <PromocaoLoteModal quantidade={alunosSelecionados.length} turmas={turmas} aoFechar={() => definirModalPromocao(false)} aoPromover={promoverLote} />}
            {modalQRCode && <CredencialModal matricula={qrcodeAtual} aoFechar={() => definirModalQRCode(false)} />}
        </LayoutAdministrativo>
    );
}
