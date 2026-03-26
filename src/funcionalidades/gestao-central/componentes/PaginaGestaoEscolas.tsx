import { useState, useEffect } from 'react';
import { 
    Search, Edit2, Ban, Plus, 
    ExternalLink, AlertTriangle, X, Zap,
    Trash2
} from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { toast } from 'react-hot-toast';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';

interface EscolaSistema {
    id: string;
    nome: string;
    slug: string;
    dominioEmail: string;
    totalAlunos: number;
    limiteAlunos: number;
    limiteTerminais: number;
    contatoSuporte: string;
    status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE';
    provedorAuth?: 'google' | 'microsoft';
    criadoEm: string;
}

export function PaginaGestaoEscolas() {
    const [busca, definirBusca] = useState('');
    const [escolas, definirEscolas] = useState<EscolaSistema[]>([]);
    const [carregando, definirCarregando] = useState(true);
    const [erro, definirErro] = useState<string | null>(null);

    // Modal Nova Unidade
    const [modalAberto, definirModalAberto] = useState(false);
    const [criando, definirCriando] = useState(false);
    const [editandoId, definirEditandoId] = useState<string | null>(null);
    const [form, definirForm] = useState({
        nome_escola: '',
        id: '',
        dominio_email: '',
        cor_primaria: '#0f172a',
        cor_secundaria: '#ffffff',
        logo_url: '',
        provedor_auth: 'google' as 'google' | 'microsoft',
        config_qr_dinamico: false,
        tts_ativado: true,
        saida_obrigatoria: true,
        metodo_acesso: 'QRCODE',
        limite_alunos: 1000,
        limite_terminais: 5,
        retencao_dados: 730,
        contato_suporte: ''
    });

    const [confirmacao, definirConfirmacao] = useState<{aberto: boolean, acao: () => void, titulo: string, mensagem: string, variante?: 'perigoso' | 'padrao'} | null>(null);

    const formPadrao = {
        nome_escola: '', id: '', dominio_email: '', 
        cor_primaria: '#0f172a', cor_secundaria: '#ffffff', 
        logo_url: '', provedor_auth: 'google' as 'google' | 'microsoft', config_qr_dinamico: false, tts_ativado: true,
        saida_obrigatoria: true, metodo_acesso: 'QRCODE',
        limite_alunos: 1000, limite_terminais: 5, retencao_dados: 730, contato_suporte: ''
    };

    const carregarDados = async () => {
        try {
            if (escolas.length === 0) definirCarregando(true);
            const dadosEscolas = await api.obter<EscolaSistema[]>('/central/escolas');
            definirEscolas(dadosEscolas);
        } catch (err: any) {
            console.error('Erro na central:', err);
            definirErro(err.message || 'Falha na conexão.');
        } finally {
            definirCarregando(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    const abrirEdicao = async (escola: EscolaSistema) => {
        try {
            const dadosCompletos = await api.obter<any>(`/central/escolas/${escola.id}`);
            definirForm({
                nome_escola: dadosCompletos.nome_escola || escola.nome,
                id: dadosCompletos.id || escola.slug,
                dominio_email: dadosCompletos.dominio_email || '',
                cor_primaria: dadosCompletos.cor_primaria || '#0f172a',
                cor_secundaria: dadosCompletos.cor_secundaria || '#ffffff',
                logo_url: dadosCompletos.logo_url || '',
                provedor_auth: dadosCompletos.provedor_auth || 'google',
                config_qr_dinamico: !!dadosCompletos.config_qr_dinamico,
                tts_ativado: dadosCompletos.tts_ativado !== 0,
                saida_obrigatoria: dadosCompletos.saida_obrigatoria !== 0,
                metodo_acesso: dadosCompletos.metodo_acesso || 'QRCODE',
                limite_alunos: dadosCompletos.limite_alunos || 1000,
                limite_terminais: dadosCompletos.limite_terminais || 5,
                retencao_dados: dadosCompletos.retencao_dados || 730,
                contato_suporte: dadosCompletos.contato_suporte || ''
            });
            definirEditandoId(escola.id);
            definirModalAberto(true);
        } catch (err: any) {
            toast.error('Falha ao recuperar os dados completos.');
        }
    };

    const alternarStatus = (escola: EscolaSistema) => {
        const novoStatus = escola.status === 'ATIVA' ? 'SUSPENSA' : 'ATIVA';
        definirConfirmacao({
            aberto: true,
            titulo: `${novoStatus === 'ATIVA' ? 'Reativar' : 'Suspender'} Unidade`,
            mensagem: `Deseja ${novoStatus === 'ATIVA' ? 'reativar' : 'suspender'} a unidade ${escola.nome}?`,
            variante: novoStatus === 'SUSPENSA' ? 'perigoso' : 'padrao',
            acao: async () => {
                try {
                    await api.atualizar(`/central/escolas/${escola.id}`, { status: novoStatus });
                    toast.success(`Unidade ${escola.nome} ${novoStatus.toLowerCase()}.`);
                    carregarDados();
                } catch (err: any) {
                    toast.error('Falha ao alterar status.');
                }
            }
        });
    };

    const lidarComExclusao = async (id: string, nome: string) => {
        definirConfirmacao({
            aberto: true,
            titulo: 'Exclusão de Unidade',
            mensagem: `Deseja apagar permanentemente a escola "${nome}" e todos os seus dados? Esta ação é irreversível.`,
            variante: 'perigoso',
            acao: async () => {
                try {
                    await api.remover(`/central/escolas/${id}`);
                    toast.success('Unidade apagada com sucesso.');
                    carregarDados();
                } catch (err: any) {
                    toast.error(err.mensagem || 'Falha ao excluir.');
                }
            }
        });
    };

    const lidarComCriacao = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            definirCriando(true);
            if (editandoId) {
                await api.atualizar(`/central/escolas/${editandoId}`, form);
                toast.success('Unidade atualizada.');
            } else {
                await api.enviar('/central/escolas', form);
                toast.success('Unidade cadastrada.');
            }
            definirModalAberto(false);
            definirEditandoId(null);
            definirForm({ ...formPadrao });
            carregarDados();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar.');
        } finally {
            definirCriando(false);
        }
    };

    const escolasFiltradas = escolas.filter(e =>
        e.nome.toLowerCase().includes(busca.toLowerCase()) ||
        e.slug.toLowerCase().includes(busca.toLowerCase())
    );

    if (carregando && escolas.length === 0) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-20 bg-slate-100 rounded-md" />
                <div className="h-64 bg-slate-100 rounded-md" />
            </div>
        );
    }

    if (erro) {
        return (
            <div className="p-8 text-center space-y-4">
                <AlertTriangle className="mx-auto text-rose-500" size={32} />
                <p className="text-slate-600">{erro}</p>
                <button onClick={carregarDados} className="px-4 py-2 bg-slate-100 rounded hover:bg-slate-200">Tentar novamente</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Gestão de Unidades</h1>
                    <p className="text-sm text-slate-500 mt-1">Adicione e gerencie as escolas da sua infraestrutura.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar unidade..."
                            className="w-full h-9 pl-9 pr-4 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors"
                            value={busca}
                            onChange={(e) => definirBusca(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => {
                            definirEditandoId(null);
                            definirForm({ ...formPadrao });
                            definirModalAberto(true);
                        }}
                        className="w-full sm:w-auto h-9 px-4 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                    >
                        <Plus size={16} />
                        Nova Unidade
                    </button>
                </div>
            </header>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                            <th className="px-6 py-3 font-medium text-slate-500">Escola</th>
                            <th className="px-6 py-3 font-medium text-slate-500">Domínio Adm</th>
                            <th className="px-6 py-3 font-medium text-slate-500 hidden xl:table-cell">SSO Padrão</th>
                            <th className="px-6 py-3 font-medium text-slate-500">Alunos / Cota</th>
                            <th className="px-6 py-3 font-medium text-slate-500 hidden lg:table-cell">Quiosques</th>
                            <th className="px-6 py-3 font-medium text-slate-500 hidden xl:table-cell">Contato</th>
                            <th className="px-6 py-3 font-medium text-slate-500">Status</th>
                            <th className="px-6 py-3 font-medium text-slate-500 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {escolasFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-500">
                                    Nenhuma unidade encontrada.
                                </td>
                            </tr>
                        ) : (
                            escolasFiltradas.map((escola) => (
                                <tr key={escola.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3">
                                        <p className="font-semibold text-slate-800">{escola.nome}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">{escola.slug}</p>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-slate-600 font-mono text-xs">{escola.dominioEmail}</span>
                                    </td>
                                    <td className="px-6 py-3 hidden xl:table-cell">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                            {escola.provedorAuth === 'microsoft' ? 'Microsoft 365' : 'Google WS'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-700 min-w-[50px]">{escola.totalAlunos || 0} / {escola.limiteAlunos || 1000}</span>
                                            <div className="flex-1 max-w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                <div 
                                                    className="h-full bg-slate-400" 
                                                    style={{ width: `${Math.min(((escola.totalAlunos || 0) / (escola.limiteAlunos || 1000)) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 hidden lg:table-cell">
                                         <span className="text-slate-600 text-xs">{escola.limiteTerminais || 5} terminais</span>
                                    </td>
                                    <td className="px-6 py-3 hidden xl:table-cell">
                                         <span className="text-slate-500 text-xs truncate max-w-[120px] block" title={escola.contatoSuporte || 'Não informado'}>{escola.contatoSuporte || '--'}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <BadgeStatus status={escola.status} />
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1 text-slate-500">
                                            <a 
                                                href={`/${escola.slug}/admin/painel`}
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-md border border-transparent hover:border-slate-200"
                                            >
                                                <ExternalLink size={13} /> Panel
                                            </a>
                                            <button 
                                                onClick={() => abrirEdicao(escola)}
                                                className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium hover:text-sky-700 hover:bg-sky-50 transition-colors rounded-md border border-transparent hover:border-sky-100"
                                            >
                                                <Edit2 size={13} /> Editar
                                            </button>
                                            <button 
                                                onClick={() => alternarStatus(escola)}
                                                className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-colors rounded-md border border-transparent ${escola.status === 'ATIVA' ? 'hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100' : 'hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-100'}`}
                                            >
                                                {escola.status === 'ATIVA' ? <><Ban size={13} /> Pausar</> : <><Zap size={13} /> Ativar</>}
                                            </button>
                                            <button 
                                                onClick={() => lidarComExclusao(escola.id, escola.nome)}
                                                className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium hover:text-rose-600 hover:bg-rose-50 transition-colors rounded-md border border-transparent hover:border-rose-100"
                                                title="Apagar Unidade permanentemente"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                            <h3 className="text-base font-semibold text-slate-800">
                                {editandoId ? 'Editar Unidade Organizacional' : 'Cadastrar Nova Unidade'}
                            </h3>
                            <button onClick={() => definirModalAberto(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-50">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form id="form-escola-central" onSubmit={lidarComCriacao} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                            
                            {/* Sessão 1: Identidade */}
                            <section className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">1. Identidade</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-600">Nome Oficial</label>
                                        <input required type="text" placeholder="Ex: CEM 01 de Brasília" value={form.nome_escola}
                                            onChange={(e) => definirForm({...form, nome_escola: e.target.value})}
                                            className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">ID Único (Slug)</label>
                                        <input required type="text" placeholder="ex: cem-01" value={form.id}
                                            onChange={(e) => definirForm({...form, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                                            className="w-full h-9 px-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none focus:bg-white"
                                        />
                                        <p className="text-[10px] text-slate-400 leading-tight">Formará o link de acesso: <span className="text-slate-500 font-mono">/ {form.id || 'slug'} /painel</span></p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Domínio Restrito Administrativo</label>
                                        <input required type="text" placeholder="Ex: @edu.se.df.gov.br" value={form.dominio_email}
                                            onChange={(e) => definirForm({...form, dominio_email: e.target.value})}
                                            className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none"
                                        />
                                        <p className="text-[10px] text-slate-400 leading-tight">Apenas emails terminados com este domínio poderão logar como admin.</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Provedor SS0 Padrão</label>
                                        <select value={form.provedor_auth}
                                            onChange={(e) => definirForm({...form, provedor_auth: e.target.value as 'google' | 'microsoft'})}
                                            className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none cursor-pointer"
                                        >
                                            <option value="google">Google Workspace (Padrão)</option>
                                            <option value="microsoft">Microsoft Entra ID (Office 365)</option>
                                        </select>
                                        <p className="text-[10px] text-slate-400 leading-tight">Define para onde o usuário será redirecionado ao logar.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Sessão 2: Aparência */}
                            <section className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">2. Estética Padrão</h4>
                                <p className="text-xs text-slate-500 -mt-2">Personaliza as cores do quiosque da portaria e recibos.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-600">Cor Principal</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={form.cor_primaria}
                                                onChange={(e) => definirForm({...form, cor_primaria: e.target.value})}
                                                className="w-8 h-8 rounded-md border-0 p-0 cursor-pointer overflow-hidden"
                                            />
                                            <input type="text" value={form.cor_primaria}
                                                onChange={(e) => definirForm({...form, cor_primaria: e.target.value})}
                                                className="w-full h-9 px-2 text-xs font-mono border border-slate-200 rounded-md uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-600">Cor de Fundo</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={form.cor_secundaria}
                                                onChange={(e) => definirForm({...form, cor_secundaria: e.target.value})}
                                                className="w-8 h-8 rounded-md border-0 p-0 cursor-pointer overflow-hidden shadow-sm"
                                            />
                                            <input type="text" value={form.cor_secundaria}
                                                onChange={(e) => definirForm({...form, cor_secundaria: e.target.value})}
                                                className="w-full h-9 px-2 text-xs font-mono border border-slate-200 rounded-md uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-600">Brasão / Logo URL</label>
                                        <input type="url" value={form.logo_url} placeholder="https://..."
                                            onChange={(e) => definirForm({...form, logo_url: e.target.value})}
                                            className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Sessão 3: Capacidade e Configuração */}
                            <section className="space-y-4">
                                <div className="border-b border-slate-100 pb-2">
                                    <h4 className="text-sm font-semibold text-slate-800">3. Capacidade e Auditoria</h4>
                                    <p className="text-xs text-slate-500 mt-1">Defina os limites contratuais e retenção de logs segundo a LGPD.</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Alunos Máx.</label>
                                        <input type="number" value={form.limite_alunos}
                                            onChange={(e) => definirForm({...form, limite_alunos: parseInt(e.target.value) || 0})}
                                            className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-md"
                                        />
                                        <p className="text-[10px] text-slate-400">Teto de cadastros.</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Terminais (Tablets)</label>
                                        <input type="number" value={form.limite_terminais}
                                            onChange={(e) => definirForm({...form, limite_terminais: parseInt(e.target.value) || 0})}
                                            className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-md"
                                        />
                                        <p className="text-[10px] text-slate-400">Quiosques simultâneos.</p>
                                    </div>
                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-xs font-semibold text-slate-700">Auditoria (Logs)</label>
                                        <select value={form.retencao_dados}
                                            onChange={(e) => definirForm({...form, retencao_dados: parseInt(e.target.value)})}
                                            className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-md"
                                        >
                                            <option value={180}>180 Dias</option>
                                            <option value={365}>1 Ano Letivo</option>
                                            <option value={730}>2 Anos (Recomendado)</option>
                                            <option value={1825}>5 Anos</option>
                                        </select>
                                        <p className="text-[10px] text-slate-400">Tempo de guarda do histórico.</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Métodos de Identificação de Aluno</label>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                        {['QRCODE', 'FACIAL', 'DIGITAL'].map(m => {
                                            const metodos = form.metodo_acesso.split(',').filter(Boolean);
                                            const ativo = metodos.includes(m);
                                            return (
                                                <label key={m} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={ativo}
                                                        onChange={() => {
                                                            const novos = ativo ? metodos.filter(x => x !== m) : [...metodos, m];
                                                            if(novos.length === 0) return;
                                                            definirForm({...form, metodo_acesso: novos.join(',')});
                                                        }}
                                                        className="w-3.5 h-3.5 accent-slate-900 border-slate-300 rounded" 
                                                    />
                                                    {m === 'QRCODE' ? 'QR Code' : m === 'FACIAL' ? 'Facial' : 'Digital'}
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            </section>

                            {/* Sessão 4: Regras de Negócio */}
                            <section className="space-y-4 pt-2">
                                <div className="border-b border-slate-100 pb-2">
                                    <h4 className="text-sm font-semibold text-slate-800">4. Funcionalidades e Regras de Negócio</h4>
                                    <p className="text-xs text-slate-500 mt-1">Ative regras vitais de funcionamento da escola.</p>
                                </div>
                                <div className="space-y-4">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={form.tts_ativado} onChange={(e) => definirForm({...form, tts_ativado: e.target.checked})} className="w-4 h-4 mt-0.5 accent-slate-900 border-slate-300 rounded" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Narração de Voz (TTS) na Portaria</span>
                                            <p className="text-[11px] text-slate-500">O quiosque anunciará o nome do aluno em voz alta caso o acesso seja autorizado.</p>
                                        </div>
                                    </label>
                                    
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={form.saida_obrigatoria} onChange={(e) => definirForm({...form, saida_obrigatoria: e.target.checked})} className="w-4 h-4 mt-0.5 accent-slate-900 border-slate-300 rounded" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Registro de Saída Obrigatório</span>
                                            <p className="text-[11px] text-slate-500">Força alunos a também registrarem as batidas de saída, computando a permanência na unidade.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={form.config_qr_dinamico} onChange={(e) => definirForm({...form, config_qr_dinamico: e.target.checked})} className="w-4 h-4 mt-0.5 accent-amber-600 border-slate-300 rounded" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Segurança Avançada: QR Code Dinâmico</span>
                                            <p className="text-[11px] text-slate-500">Exige autenticidade OTP, regerando o QR do aluno constantemente para coibir envios via WhatsApp.</p>
                                        </div>
                                    </label>
                                </div>
                            </section>

                        </form>

                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                            <button 
                                type="button" 
                                onClick={() => definirModalAberto(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors rounded-md"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                form="form-escola-central"
                                disabled={criando}
                                className="px-6 py-2 min-w-[120px] bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                {criando ? 'Processando...' : editandoId ? 'Atualizar Diretrizes' : 'Finalizar Criação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmacao?.aberto && (
                <ModalConfirmacao
                    titulo={confirmacao.titulo}
                    mensagem={confirmacao.mensagem}
                    aoConfirmar={() => {
                        confirmacao.acao();
                        definirConfirmacao(null);
                    }}
                    aoCancelar={() => definirConfirmacao(null)}
                    variante={confirmacao.variante}
                />
            )}
        </div>
    );
}

function BadgeStatus({ status }: { status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE' }) {
    if (status === 'ATIVA') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Operacional
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Offline
        </span>
    );
}
