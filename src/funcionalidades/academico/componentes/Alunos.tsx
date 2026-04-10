import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao, BarraFiltro, InputBusca } from '@/compartilhado/componentes/UI';
import { Plus, Search, Upload, Calendar, Layers, CheckCircle2, XCircle, Grid } from 'lucide-react';
import toast from 'react-hot-toast';

import { alunoServico } from '../servicos/aluno.servico';
import { Aluno } from '../tipos/academico';

import { usarNotificacoes } from '@compartilhado/contextos/ContextoNotificacoes';
import { usarEscola } from '@/escola/ProvedorEscola';

import CredencialModal from './CredencialModal';
import BarraSelecaoLote from './BarraSelecaoLote';
import ListaAlunos from './ListaAlunos';
import FormAlunoModal from './FormAlunoModal';
import ImportacaoAlunosModal from './ImportacaoAlunosModal';
import PromocaoLoteModal from './PromocaoLoteModal';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';
import ImpressaoCredenciaisLote from './ImpressaoCredenciaisLote';

import { api } from '@/compartilhado/servicos/api';

export default function Alunos() {
    const { adicionarNotificacao } = usarNotificacoes();
    const escola = usarEscola();

    const { dados, carregando, carregandoInicial, recarregar } = usarConsulta(
        ['alunos-e-turmas-online'],
        () => alunoServico.carregarOnline()
    );
    const alunos = (dados?.alunos as Aluno[]) || [];
    const turmas = dados?.turmas || [];

    const [searchParams, setSearchParams] = useSearchParams();
    const termoInicial = searchParams.get('busca') || searchParams.get('turma') || '';
    const statusInicial = (searchParams.get('status') as 'ativos' | 'inativos' | 'todos') || 'ativos';

    const [termoBusca, definirTermoBusca] = useState(termoInicial);
    const [filtroStatus, definirFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>(statusInicial);
    const [filtroAnoLetivo, definirFiltroAnoLetivo] = useState(new Date().getFullYear().toString());
    const [paginaAtual, definirPaginaAtual] = useState(1);
    const itensPorPagina = 12;

    // Sincronizar termo da URL se mudar externamente (ex: sidebar ou botões de filtro)
    useEffect(() => {
        const busca = searchParams.get('busca');
        const turma = searchParams.get('turma');
        const status = searchParams.get('status');
        
        // Se não houver busca nem turma na URL, limpa o campo (reset da sidebar)
        if (busca === null && turma === null) {
            definirTermoBusca('');
        } else {
            if (busca !== null) definirTermoBusca(busca);
            else if (turma !== null) definirTermoBusca(turma);
        }

        if (status) {
            definirFiltroStatus(status as any);
        } else {
            definirFiltroStatus('ativos'); // Reset para padrão se não houver status na URL
        }

        if (searchParams.get('acao') === 'novo') {
            definirAlunoEmEdicao(null);
            definirModalForm(true);
        }
    }, [searchParams]);

    const [modalForm, definirModalForm] = useState(searchParams.get('acao') === 'novo');
    const [modalImport, definirModalImport] = useState(false);
    const [modalPromocao, definirModalPromocao] = useState(false);
    const [modalQRCode, definirModalQRCode] = useState(false);
    const [alunoEmEdicao, definirAlunoEmEdicao] = useState<Aluno | null>(null);
    const [alunoParaQRCode, definirAlunoParaQRCode] = useState<Aluno | null>(null);
    const [alunosSelecionados, definirAlunosSelecionados] = useState<string[]>([]);
    const [alunoParaExcluir, definirAlunoParaExcluir] = useState<Aluno | null>(null);


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
            await alunoServico.salvarAluno(
                { ...dadosForm, criado_em: alunoEmEdicao?.criado_em || new Date().toISOString() }, 
                !!alunoEmEdicao,
                alunoEmEdicao || undefined
            );
            toast.success(alunoEmEdicao ? 'Registro de aluno atualizado' : 'Novo aluno matriculado com sucesso');
            definirModalForm(false);
            recarregar();
        } catch (erro: any) { toast.error(erro.message || 'Falha ao processar registro.'); }
    };

    const excluirAluno = (aluno: Aluno) => {
        definirAlunoParaExcluir(aluno);
    };

    const confirmarExclusao = async () => {
        if (!alunoParaExcluir) return;
        try {
            await alunoServico.excluirAluno(alunoParaExcluir.matricula);
            toast.success('Registro removido do sistema');
            recarregar();
        } catch (erro) { 
            toast.error('Erro na exclusão do registro.'); 
        } finally {
            definirAlunoParaExcluir(null);
        }
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
        const cores = ['from-eletrico to-cyan-600', 'from-emerald-400 to-teal-600', 'from-rose-400 to-pink-600', 'from-amber-400 to-orange-500', 'from-sky-400 to-blue-600', 'from-violet-500 to-fuchsia-600'];
        return cores[parseInt(id.slice(-1)) % cores.length || 0];
    };

    const AcoesHeader = (
        <div className="flex gap-3">
            <Botao
                variante="secundario"
                tamanho="sm"
                icone={Upload}
                onClick={() => definirModalImport(true)}
                className="hidden md:flex"
            >
                Importar Dados
            </Botao>
            <Botao
                variante="primario"
                tamanho="sm"
                icone={Plus}
                onClick={() => { definirAlunoEmEdicao(null); definirModalForm(true); }}
            >
                Matricular Aluno
            </Botao>
        </div>
    );

    return (
        <LayoutAdministrativo
            titulo="Gestão de Alunos"
            subtitulo="Gerencie as matrículas e as informações dos estudantes"
            acoes={AcoesHeader}
            carregando={carregando}
        >
            <BarraFiltro className="bg-white border-slate-200 shadow-suave p-3 rounded-2xl">
                <div className="flex flex-col gap-2 flex-1 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 leading-none">Buscar Aluno</label>
                    <InputBusca
                        icone={Search}
                        placeholder="Nome, matrícula ou turma..."
                        value={termoBusca}
                        onChange={(e) => definirTermoBusca(e.target.value)}
                        className="w-full h-11"
                    />
                </div>

                {/* Filtro de Ano Letivo */}
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

                {/* Filtro de Status */}
                <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 leading-none">Situação</label>
                    <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200 h-11">
                        {(['ativos', 'inativos', 'todos'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => definirFiltroStatus(status)}
                                className={`px-4 h-full rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border ${filtroStatus === status
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-suave'
                                    : 'text-slate-400 border-transparent hover:text-slate-600'
                                    }`}
                            >
                                {status === 'ativos' && <CheckCircle2 size={12} />}
                                {status === 'inativos' && <XCircle size={12} />}
                                {status === 'todos' && <Grid size={12} />}
                                {status === 'ativos' ? 'Ativos' : status === 'inativos' ? 'Inativos' : 'Todos'}
                            </button>
                        ))}
                    </div>
                </div>
            </BarraFiltro>

            <ListaAlunos
                alunos={paginados}
                alunosSelecionados={alunosSelecionados}
                paginaAtual={paginaAtual}
                totalPaginas={totalPaginas}
                aoSelecionar={(m) => definirAlunosSelecionados(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                aoVerQRCode={(m) => { 
                    const aluno = alunos.find(a => a.matricula === m);
                    if (aluno) {
                        definirAlunoParaQRCode(aluno); 
                        definirModalQRCode(true); 
                    }
                }}
                aoEditar={(a) => { definirAlunoEmEdicao(a); definirModalForm(true); }}
                aoExcluir={excluirAluno}
                aoMudarPagina={definirPaginaAtual}
                obterCorAvatar={obterCorAvatar}

                carregando={carregandoInicial}
            />

            <BarraSelecaoLote
                quantidade={alunosSelecionados.length}
                aoPromover={() => definirModalPromocao(true)}
                aoImprimir={() => window.print()}
                aoCancelar={() => definirAlunosSelecionados([])}
            />

            <ImpressaoCredenciaisLote 
                alunos={alunos.filter(a => alunosSelecionados.includes(a.matricula))} 
            />

            {modalForm && <FormAlunoModal aluno={alunoEmEdicao} turmas={turmas} aoFechar={() => definirModalForm(false)} aoSalvar={salvarAluno} />}
            {modalImport && <ImportacaoAlunosModal aoFechar={() => definirModalImport(false)} onImport={importarAlunos} />}
            {modalPromocao && <PromocaoLoteModal quantidade={alunosSelecionados.length} turmas={turmas} aoFechar={() => definirModalPromocao(false)} aoPromover={promoverLote} />}
            {modalQRCode && alunoParaQRCode && <CredencialModal aluno={alunoParaQRCode} aoFechar={() => definirModalQRCode(false)} />}

            {alunoParaExcluir && (
                <ModalConfirmacao
                    titulo="Remover Aluno"
                    mensagem={`Tem certeza que deseja remover o registro de ${alunoParaExcluir.nome_completo}? Esta ação é permanente.`}
                    textoConfirmar="Sim, Remover"
                    aoConfirmar={confirmarExclusao}
                    aoCancelar={() => definirAlunoParaExcluir(null)}
                    variante="perigo"
                />
            )}


        </LayoutAdministrativo>
    );
}



