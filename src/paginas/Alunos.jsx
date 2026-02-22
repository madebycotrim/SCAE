import { useState, useEffect } from 'react';
import LayoutAdministrativo from '../componentes/LayoutAdministrativo';
import ModalUniversal from '../componentes/ModalUniversal';
import { bancoLocal } from '../servicos/bancoLocal';
import { api } from '../servicos/api';
import SelectComBusca from '../componentes/SelectComBusca';
import {
    Users,
    Search,
    Plus,
    Filter,
    Edit2,
    Trash2,
    QrCode,
    MoreVertical,
    Download,
    Upload,
    CheckCircle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Camera,
    FileSpreadsheet,
    AlertTriangle,
    Clipboard,
    FileText
} from 'lucide-react';
import { read, utils } from 'xlsx';
import toast from 'react-hot-toast';
import { Registrador } from '../servicos/registrador';


export default function Alunos() {
    const [alunos, definirAlunos] = useState([]);
    const [turmas, definirTurmas] = useState([]);
    const [carregando, definirCarregando] = useState(true);
    const [modalAberto, definirModalAberto] = useState(false);
    const [modalImportacao, definirModalImportacao] = useState(false);
    const [importando, definirImportando] = useState(false);
    const [resultadoImportacao, definirResultadoImportacao] = useState(null);
    const [textoColado, definirTextoColado] = useState('');

    // Estados Adicionais Faltantes
    const [alunoEmEdicao, definirAlunoEmEdicao] = useState(null);
    const [modalQRCode, definirModalQRCode] = useState(false);
    const [qrcodeAtual, definirQrcodeAtual] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [tabAtiva, setTabAtiva] = useState('arquivo'); // arquivo | colar








    const importarDados = async (jsonData) => {
        let sucessos = 0;
        let erros = 0;
        let errosDetalhes = [];
        const novosAlunos = [];

        // Obter matrículas já existentes
        const matriculasExistentes = new Set(alunos.map(a => a.matricula));

        for (const row of jsonData) {
            // Normalizar chaves para suportar visualização de array (colar) ou objeto (arquivo)
            // Se for array (colar): index 0 = Nome, 1 = Matricula, 2 = Turma
            // Se for objeto (arquivo): usar chaves

            let nome, matricula, turma;

            if (Array.isArray(row)) {
                if (row.length < 2) continue; // Linha vazia ou incompleta
                nome = row[0];
                matricula = row[1];
                turma = row[2];
            } else {
                nome = row['Nome Completo'] || row['Nome'] || row['nome'];
                matricula = row['Matricula'] || row['Matrícula'] || row['matricula'];
                turma = row['Turma'] || row['turma'];
            }

            const aluno = {
                nome_completo: nome,
                matricula: String(matricula || '').trim(),
                turma_id: turma
            };

            // Validação Básica
            if (!aluno.nome_completo || !aluno.matricula) {
                // Não contar linha vazia como erro se for totalmente vazia
                if (!aluno.nome_completo && !aluno.matricula && !aluno.turma_id) continue;
                erros++;
                continue;
            }

            // Verificar duplicidade
            if (matriculasExistentes.has(aluno.matricula)) {
                erros++;
                errosDetalhes.push(`Matrícula duplicada: ${aluno.matricula} (${aluno.nome_completo})`);
                continue;
            }

            novosAlunos.push({
                ...aluno,
                criado_em: new Date().toISOString()
            });
            matriculasExistentes.add(aluno.matricula);
            sucessos++;
        }

        if (novosAlunos.length > 0) {
            const banco = await bancoLocal.iniciarBanco();
            const tx = banco.transaction('alunos', 'readwrite');
            await Promise.all(novosAlunos.map(aluno => tx.store.put(aluno)));
            await tx.done;

            await carregarDados();
            toast.success(`${sucessos} alunos importados com sucesso!`);
        } else {
            if (sucessos === 0 && erros === 0) {
                toast.error("Nenhum dado encontrado ou colunas incorretas.");
            }
        }

        return {
            total: jsonData.length,
            sucessos,
            erros,
            detalhes: errosDetalhes
        };
    };


    const processarArquivo = async (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;

        definirImportando(true);
        definirResultadoImportacao(null);

        try {
            const data = await arquivo.arrayBuffer();
            const workbook = read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            // Sheet to json padrão gera objetos
            const jsonDataObjetos = utils.sheet_to_json(worksheet);

            const resultado = await importarDados(jsonDataObjetos);
            definirResultadoImportacao(resultado);

        } catch (erro) {
            console.error("Erro na importação:", erro);
            toast.error("Falha ao processar arquivo.");
        } finally {
            definirImportando(false);
            e.target.value = null;
        }
    };

    const processarColagem = async () => {
        if (!textoColado.trim()) {
            toast.error("Cole os dados primeiro.");
            return;
        }

        definirImportando(true);
        definirResultadoImportacao(null);

        try {
            // Processar TSV (Tab Separated Values) ou CSV simples
            // Excel copia com \t entre colunas e \n entre linhas
            const linhas = textoColado.trim().split('\n');
            const data = linhas.map(linha => linha.split('\t'));

            // Remover cabeçalho se houver (se a primeira linha parecer cabeçalho)
            // Lógica simples: se primeira coluna for "Nome..." ignorar
            if (data.length > 0) {
                const primeiraLinha = (data[0][0] || '').toLowerCase();
                if (primeiraLinha.includes('nome') || primeiraLinha.includes('matricula')) {
                    data.shift();
                }
            }

            const resultado = await importarDados(data);
            definirResultadoImportacao(resultado);
        } catch (erro) {
            console.error("Erro na colagem:", erro);
            toast.error("Falha ao processar texto colado.");
        } finally {
            definirImportando(false);
        }
    };

    // Filtros e Busca
    const [termoBusca, definirTermoBusca] = useState('');
    const [filtroTurma, definirFiltroTurma] = useState('');
    const [paginaAtual, definirPaginaAtual] = useState(1);
    const itensPorPagina = 10;

    // Form
    const [dadosFormulario, definirDadosFormulario] = useState({
        nome: '',
        matricula: '',
        turma: ''
    });

    const carregarDados = async () => {
        try {
            definirCarregando(true);
            const banco = await bancoLocal.iniciarBanco();
            const listaAlunos = await banco.getAll('alunos');
            const listaTurmas = await banco.getAll('turmas');

            // Ordenar por nome
            listaAlunos.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
            listaTurmas.sort((a, b) => a.id.localeCompare(b.id));

            definirAlunos(listaAlunos);
            definirTurmas(listaTurmas);
        } catch (erro) {
            console.error('Erro ao carregar:', erro);
            toast.error('Erro ao carregar lista de alunos.');
        } finally {
            definirCarregando(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    const salvarAluno = async () => {
        if (!dadosFormulario.nome || !dadosFormulario.matricula || !dadosFormulario.turma) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        try {
            const banco = await bancoLocal.iniciarBanco();

            // Verificar duplicidade
            if (!alunoEmEdicao) {
                const existente = await banco.get('alunos', dadosFormulario.matricula);
                if (existente) {
                    toast.error('Matrícula já cadastrada!');
                    return;
                }
            }

            const alunoObj = {
                matricula: dadosFormulario.matricula,
                nome_completo: dadosFormulario.nome, // Mantendo compatibilidade com schema
                turma_id: dadosFormulario.turma,
                criado_em: alunoEmEdicao ? alunoEmEdicao.criado_em : new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            };

            await banco.put('alunos', alunoObj);

            if (navigator.onLine) {
                try {
                    await api.enviar(`/alunos/${dadosFormulario.matricula}`, alunoObj);
                } catch (e) { console.warn('Sync nuvem falhou:', e); }
            }

            // Log de Auditoria
            const acaoLog = alunoEmEdicao ? 'ALUNO_EDITAR' : 'ALUNO_CRIAR';
            await Registrador.registrar(acaoLog, 'aluno', alunoObj.matricula, {
                nome: alunoObj.nome_completo,
                turma: alunoObj.turma_id
            });

            toast.success(alunoEmEdicao ? 'Aluno atualizado!' : 'Aluno cadastrado!');
            definirModalAberto(false);
            carregarDados();
            limparForm();
        } catch (erro) {
            console.error('Erro ao salvar:', erro);
            toast.error('Falha ao salvar aluno.');
        }
    };

    const excluirAluno = async (matricula) => {
        if (!window.confirm(`Excluir aluno ${matricula}?`)) return;

        try {
            const banco = await bancoLocal.iniciarBanco();
            await banco.delete('alunos', matricula);

            // Sync delete...
            // Log de Auditoria
            await Registrador.registrar('ALUNO_EXCLUIR', 'aluno', matricula, {});

            toast.success('Aluno removido.');
            carregarDados();
        } catch (erro) {
            toast.error('Erro ao excluir.');
        }
    };

    const abrirEdicao = (aluno) => {
        definirAlunoEmEdicao(aluno);
        definirDadosFormulario({
            nome: aluno.nome_completo,
            matricula: aluno.matricula,
            turma: aluno.turma_id
        });
        definirModalAberto(true);
    };

    const abrirNovo = () => {
        limparForm();
        definirModalAberto(true);
    };

    const limparForm = () => {
        definirAlunoEmEdicao(null);
        definirDadosFormulario({ nome: '', matricula: '', turma: '' });
    };

    const [modalExclusaoAberto, definirModalExclusaoAberto] = useState(false);
    const [alunoParaExcluir, definirAlunoParaExcluir] = useState(null);

    // ... (existing code)

    const solicitarExclusao = (aluno) => {
        definirAlunoParaExcluir(aluno);
        definirModalExclusaoAberto(true);
    };

    const confirmarExclusao = async () => {
        if (!alunoParaExcluir) return;
        try {
            await excluirAluno(alunoParaExcluir.matricula);
            definirModalExclusaoAberto(false);
            definirAlunoParaExcluir(null);
            // toast.success já é chamado dentro de excluirAluno? Não, ele chama carregarAlunos que não tem toast de sucesso de exclusão.
            // Vamos assumir que excluirAluno faz o trabalho pesado.
        } catch (error) {
            console.error(error);
        }
    };

    const verQRCode = (matricula) => {
        definirQrcodeAtual(matricula);
        definirModalQRCode(true);
    };

    // Lógica de Paginação e Filtro
    const alunosFiltrados = alunos.filter(a => {
        const matchNome = a.nome_completo.toLowerCase().includes(termoBusca.toLowerCase()) ||
            a.matricula.includes(termoBusca);
        const matchTurma = !filtroTurma || a.turma_id === filtroTurma;
        return matchNome && matchTurma;
    });

    const totalPaginas = Math.ceil(alunosFiltrados.length / itensPorPagina);
    const paginados = alunosFiltrados.slice(
        (paginaAtual - 1) * itensPorPagina,
        paginaAtual * itensPorPagina
    );

    // Avatar Generator Based on Matricula (Premium Gradients)
    const getAvatarColor = (id) => {
        const colors = [
            'from-indigo-500 to-purple-600',
            'from-emerald-400 to-teal-600',
            'from-rose-400 to-pink-600',
            'from-amber-400 to-orange-500',
            'from-sky-400 to-blue-600',
            'from-violet-500 to-fuchsia-600'
        ];
        const index = parseInt(id.slice(-1)) % colors.length || 0;
        return colors[index];
    };

    const AcoesHeader = (
        <div className="flex gap-2">
            <button
                onClick={() => definirModalImportacao(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-indigo-600 transition-all"
            >
                <Upload size={18} /> Importar
            </button>
            <button
                onClick={abrirNovo}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 border border-white/10"
            >
                <Plus size={20} />
                <span className="hidden sm:inline">Novo Aluno</span>
            </button>
        </div>
    );

    return (
        <LayoutAdministrativo titulo="Gestão de Alunos" subtitulo="Cadastro e controle de matrículas" acoes={AcoesHeader}>

            {/* Filters Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 sticky top-0 z-20">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou matrícula..."
                        value={termoBusca}
                        onChange={(e) => definirTermoBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all placeholder:text-slate-400 shadow-sm"
                    />
                </div>

                <div className="w-full md:w-48">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={filtroTurma}
                            onChange={(e) => definirFiltroTurma(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer"
                        >
                            <option value="">Todas as Turmas</option>
                            {turmas.map(t => (
                                <option key={t.id} value={t.id}>{t.id}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Students Grid */}
            <div className="space-y-6">
                {carregando ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-64 bg-slate-100/50 rounded-3xl"></div>
                        ))}
                    </div>
                ) : alunosFiltrados.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center animate-fade-in">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 mx-auto shadow-sm border border-slate-100">
                            <Users size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-700 mb-2">Nenhum aluno encontrado</h3>
                        <p className="text-slate-400 max-w-xs mx-auto text-sm font-medium">Tente ajustar seus filtros ou adicione um novo aluno ao sistema.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up">
                        {paginados.map((aluno) => (
                            <div
                                key={aluno.matricula}
                                className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                            >
                                {/* Pattern Background */}
                                <div className={`absolute top-0 inset-x-0 h-24 bg-gradient-to-br ${getAvatarColor(aluno.matricula)} opacity-10 group-hover:opacity-20 transition-opacity`}></div>

                                {/* Avatar & Header */}
                                <div className="relative px-6 pt-8 pb-4 flex flex-col items-center flex-1">
                                    <div className={`
                                        w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarColor(aluno.matricula)} 
                                        flex items-center justify-center text-white font-black text-2xl 
                                        shadow-lg shadow-indigo-500/20 ring-4 ring-white group-hover:scale-110 transition-transform duration-300
                                        mb-4
                                    `}>
                                        {aluno.nome_completo.split(' ').map((n, i, arr) => i === 0 || i === arr.length - 1 ? n[0] : '').join('').toUpperCase().substring(0, 2)}
                                    </div>

                                    <h3 className="text-slate-800 font-bold text-lg text-center leading-tight mb-1 line-clamp-2 min-h-[3.5rem] flex items-center justify-center">
                                        {aluno.nome_completo}
                                    </h3>

                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold font-mono tracking-wide border border-slate-200">
                                            {aluno.matricula}
                                        </span>
                                    </div>

                                    <div className="w-full grid grid-cols-2 gap-2 mt-auto">
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Turma</p>
                                            <p className="text-indigo-600 font-black text-sm">{aluno.turma_id || '---'}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <p className="text-emerald-600 font-bold text-xs">Ativo</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => verQRCode(aluno.matricula)}
                                        className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <QrCode size={16} /> QR
                                    </button>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => abrirEdicao(aluno)}
                                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => solicitarExclusao(aluno)}
                                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {paginados.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between shadow-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                            Mostrando {paginados.length} de {alunosFiltrados.length}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => definirPaginaAtual(p => Math.max(1, p - 1))}
                                disabled={paginaAtual === 1}
                                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="flex items-center px-4 font-bold text-sm text-slate-600 bg-slate-50 rounded-xl border border-slate-100">
                                {paginaAtual} / {totalPaginas}
                            </span>
                            <button
                                onClick={() => definirPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                                disabled={paginaAtual === totalPaginas}
                                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Novo/Editar */}
            {modalAberto && (
                <ModalUniversal
                    titulo={alunoEmEdicao ? "Editar Cadastro do Aluno" : "Matricular Novo Aluno"}
                    subtitulo={alunoEmEdicao ? "Atualize os dados pessoais ou escolaridade do aluno." : "Preencha os dados abaixo para registrar um novo aluno no sistema."}
                    fechavel
                    aoFechar={() => definirModalAberto(false)}
                >
                    <div className="space-y-6">
                        {/* Nome Completo */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome do Aluno</label>
                            <input
                                type="text"
                                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-lg font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                                value={dadosFormulario.nome}
                                onChange={(e) => definirDadosFormulario({ ...dadosFormulario, nome: e.target.value })}
                                placeholder="Ex: João da Silva"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Matrícula */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Matrícula</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-base font-black text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono tracking-wide"
                                        value={dadosFormulario.matricula}
                                        onChange={(e) => definirDadosFormulario({ ...dadosFormulario, matricula: e.target.value })}
                                        disabled={!!alunoEmEdicao}
                                        placeholder="000000"
                                    />
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center text-slate-400 border-r border-slate-200">
                                        <span className="text-xs font-bold">#</span>
                                    </div>
                                </div>
                            </div>

                            {/* Turma */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Turma</label>
                                <div className="relative">
                                    <SelectComBusca
                                        options={turmas.map(t => ({ value: t.id, label: t.id }))}
                                        value={dadosFormulario.turma}
                                        onChange={(valor) => definirDadosFormulario({ ...dadosFormulario, turma: valor })}
                                        placeholder="Selecione a turma..."
                                    />
                                </div>
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
                                onClick={salvarAluno}
                                className="flex-[2] py-4 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 uppercase tracking-wide text-xs"
                            >
                                <CheckCircle size={18} className="text-indigo-200" />
                                {alunoEmEdicao ? 'Salvar Alterações' : 'Cadastrar Aluno'}
                            </button>
                        </div>
                    </div>
                </ModalUniversal>
            )}

            {/* Modal QR Code */}
            {modalQRCode && (
                <ModalUniversal
                    titulo="Carteirinha Digital"
                    fechavel
                    aoFechar={() => definirModalQRCode(false)}
                >
                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-slate-100 shadow-inner">
                        <div className="p-4 bg-white border-4 border-slate-900 rounded-2xl mb-4">
                            {/* Placeholder QR - Em prod usar lib qrcode.react */}
                            <div className="w-48 h-48 bg-slate-900 flex items-center justify-center text-white font-mono text-xs">
                                [QR: {qrcodeAtual}]
                            </div>
                        </div>
                        <p className="text-sm font-bold text-slate-800 mb-1">Matrícula: {qrcodeAtual}</p>
                        <p className="text-xs text-slate-400">Escaneie para registrar acesso</p>
                    </div>
                </ModalUniversal>
            )}

            {/* Modal Importação Premium */}
            {modalImportacao && (
                <ModalUniversal
                    titulo="Importação em Massa"
                    subtitulo="Selecione o arquivo ou cole os dados para cadastrar múltiplos alunos."
                    fechavel
                    aoFechar={() => {
                        definirModalImportacao(false);
                        definirResultadoImportacao(null);
                    }}
                >
                    <div className="p-1">
                        {!resultadoImportacao ? (
                            <div className="space-y-6">
                                {/* Tab Navigation (Segmented Control) */}
                                <div className="flex p-1 bg-slate-100/80 rounded-xl mb-6 relative">
                                    <button
                                        onClick={() => setTabAtiva('arquivo')}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${tabAtiva === 'arquivo' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <FileSpreadsheet size={16} />
                                        Planilha Excel/CSV
                                    </button>
                                    <button
                                        onClick={() => setTabAtiva('colar')}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${tabAtiva === 'colar' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Clipboard size={16} />
                                        Colar Texto
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Tab: Arquivo */}
                                    {tabAtiva === 'arquivo' && (
                                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                            <div
                                                className={`group relative transition-all duration-300 ${isDragging ? 'scale-[1.02]' : ''}`}
                                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    setIsDragging(false);
                                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                        processarArquivo({ target: { files: e.dataTransfer.files } });
                                                    }
                                                }}
                                            >
                                                <div className={`absolute -inset-0.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl transition duration-500 blur opacity-20 ${isDragging ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover:opacity-100'}`}></div>
                                                <div className={`relative bg-white border-2 ${isDragging ? 'border-indigo-500 bg-indigo-50/30 border-dashed' : 'border-slate-200 border-dashed hover:border-indigo-300 hover:bg-slate-50'} rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all min-h-[300px]`}>
                                                    <input
                                                        type="file"
                                                        accept=".xlsx, .xls, .csv"
                                                        onChange={processarArquivo}
                                                        disabled={importando}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-300 shadow-lg shadow-indigo-500/10 ${isDragging ? 'bg-indigo-600 text-white scale-110 rotate-12' : 'bg-indigo-50 text-indigo-600 group-hover:scale-110 group-hover:rotate-6'}`}>
                                                        {importando ? (
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                                        ) : (
                                                            <Upload size={32} />
                                                        )}
                                                    </div>
                                                    <h3 className={`font-black text-xl mb-2 transition-colors ${isDragging ? 'text-indigo-700' : 'text-slate-800'}`}>
                                                        {isDragging ? 'Solte o arquivo aqui!' : 'Clique ou Arraste seu Arquivo'}
                                                    </h3>
                                                    <p className="text-slate-400 mb-6 max-w-xs mx-auto leading-relaxed">
                                                        Suportamos arquivos .xlsx, .xls e .csv. <br /> O processamento é instantâneo.
                                                    </p>

                                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50/50 px-4 py-2 rounded-full border border-indigo-100/50">
                                                        <FileSpreadsheet size={14} />
                                                        Modelo Recomendado
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab: Colar */}
                                    {tabAtiva === 'colar' && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                                            <div className="flex flex-col h-full min-h-[300px]">
                                                <div className="relative flex-1 bg-white border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all overflow-hidden group shadow-sm">
                                                    <div className="absolute top-0 left-0 right-0 h-8 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
                                                        <div className="flex gap-1.5">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-400 ml-2">dados_alunos.txt</span>
                                                    </div>
                                                    <textarea
                                                        value={textoColado}
                                                        onChange={(e) => definirTextoColado(e.target.value)}
                                                        placeholder={`Nome Completo\tMatrícula\tTurma\nJoão Silva\t2023001\t3A\nMaria Souza\t2023002\t3B`}
                                                        className="w-full h-full min-h-[220px] p-5 pt-12 bg-transparent border-none text-sm font-mono text-slate-600 focus:outline-none resize-none placeholder:text-slate-300/50 leading-relaxed"
                                                    ></textarea>
                                                    <div className="absolute top-10 right-4 p-2 bg-slate-50 rounded-lg shadow-sm border border-slate-100 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                                                        <Clipboard size={18} />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={processarColagem}
                                                    disabled={importando || !textoColado.trim()}
                                                    className="mt-4 w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 active:scale-[0.98]"
                                                >
                                                    <FileText size={18} />
                                                    Processar Dados Colados
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Warning Footer & Template Download */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-2 border-t border-slate-50">
                                    <div className="flex items-start gap-2 text-xs text-slate-500 max-w-sm">
                                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                                        <span>
                                            Certifique-se que as colunas são: <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded">Nome</span>, <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded">Matrícula</span> e <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded">Turma</span>.
                                        </span>
                                    </div>


                                </div>
                            </div>

                        ) : (
                            <div className="animate-in fade-in zoom-in duration-300">
                                {/* Resultado Header */}
                                <div className="text-center mb-8">
                                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${resultadoImportacao.erros > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {resultadoImportacao.erros > 0 ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Processamento Concluído</h3>
                                    <p className="text-slate-500 text-sm">Confira o resumo da operação abaixo.</p>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 flex flex-col items-center">
                                        <span className="text-4xl font-black text-emerald-600 mb-2">{resultadoImportacao.sucessos}</span>
                                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700/70">Sucessos</span>
                                    </div>
                                    <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100 flex flex-col items-center">
                                        <span className="text-4xl font-black text-rose-600 mb-2">{resultadoImportacao.erros}</span>
                                        <span className="text-xs font-bold uppercase tracking-widest text-rose-700/70">Falhas</span>
                                    </div>
                                </div>

                                {/* Error Log */}
                                {resultadoImportacao.detalhes.length > 0 && (
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6 shadow-sm">
                                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                            <span className="font-bold text-xs uppercase text-slate-500 tracking-wider">Erros Encontrados</span>
                                            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{resultadoImportacao.detalhes.length}</span>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto p-2">
                                            {resultadoImportacao.detalhes.map((erro, i) => (
                                                <div key={i} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-sm text-slate-600 border-b border-slate-50 last:border-0">
                                                    <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                                    <span>{erro}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            definirModalImportacao(false);
                                            definirResultadoImportacao(null);
                                        }}
                                        className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition"
                                    >
                                        Fechar
                                    </button>
                                    <button
                                        onClick={() => definirResultadoImportacao(null)}
                                        className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 active:scale-95"
                                    >
                                        Nova Importação
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </ModalUniversal>
            )
            }
            {/* Modal de Exclusão */}
            {
                modalExclusaoAberto && alunoParaExcluir && (
                    <ModalUniversal
                        aberto={modalExclusaoAberto}
                        aoFechar={() => definirModalExclusaoAberto(false)}
                        titulo="Excluir Aluno"
                        subtitulo="Esta ação é irreversível e removerá todos os dados deste aluno."
                        icone={Trash2}
                        cor="rose"
                        tamanho="sm"
                    >
                        <div className="p-4">
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                Você está prestes a excluir o aluno <strong className="text-slate-900">{alunoParaExcluir.nome_completo}</strong> (Matrícula: {alunoParaExcluir.matricula}).
                                <br /><br />
                                Deseja realmente continuar?
                            </p>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
                                <button
                                    onClick={() => definirModalExclusaoAberto(false)}
                                    className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmarExclusao}
                                    className="px-5 py-2 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </ModalUniversal>
                )
            }

        </LayoutAdministrativo >
    );
}
